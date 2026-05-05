import { createRequire } from "node:module";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);

const { prismaMock } = vi.hoisted(() => {
  const mock = {
    job: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
    statusHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // Run the callback form of $transaction against the same mock so the service
  // interacts with one consistent set of spies.
  mock.$transaction.mockImplementation(async (fn) => fn(mock));
  return { prismaMock: mock };
});

globalThis.__VITEST_PRISMA__ = prismaMock;

const {
  createJob,
  listJobs,
  getJobById,
  updateJob,
  deleteJob,
  getFunnelMetrics,
  getTimeAppliedToInterview,
} = require("./job.service.js");

afterAll(() => {
  delete globalThis.__VITEST_PRISMA__;
});

describe("job.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn) => fn(prismaMock));
  });

  it("createJob passes userId and payload and writes initial status history", async () => {
    const payload = {
      company: "Acme",
      role: "Engineer",
      status: "applied",
      appliedDate: new Date("2026-01-01"),
    };
    prismaMock.job.create.mockResolvedValue({ id: "job-1", ...payload, userId: "u1" });

    const result = await createJob("u1", payload);

    expect(prismaMock.job.create).toHaveBeenCalledWith({
      data: {
        ...payload,
        userId: "u1",
        status: "applied",
        statusHistory: { create: { status: "applied" } },
      },
    });
    expect(result.id).toBe("job-1");
  });

  it("createJob defaults to 'applied' when payload omits status", async () => {
    const payload = {
      company: "Initech",
      role: "Dev",
      appliedDate: new Date("2026-02-01"),
    };
    prismaMock.job.create.mockResolvedValue({ id: "job-2", ...payload, status: "applied", userId: "u1" });

    await createJob("u1", payload);

    expect(prismaMock.job.create).toHaveBeenCalledWith({
      data: {
        ...payload,
        status: "applied",
        userId: "u1",
        statusHistory: { create: { status: "applied" } },
      },
    });
  });

  it("listJobs scopes by userId and orders by appliedDate desc", async () => {
    prismaMock.job.findMany.mockResolvedValue([]);

    await listJobs("user-42");

    expect(prismaMock.job.findMany).toHaveBeenCalledWith({
      where: { userId: "user-42" },
      orderBy: { appliedDate: "desc" },
    });
  });

  it("getJobById throws 404 when job is missing", async () => {
    prismaMock.job.findFirst.mockResolvedValue(null);

    await expect(getJobById("u1", "missing-id")).rejects.toMatchObject({
      statusCode: 404,
      message: "Job not found",
    });
    expect(prismaMock.job.findFirst).toHaveBeenCalledWith({
      where: { id: "missing-id", userId: "u1" },
    });
  });

  it("getJobById returns job when found", async () => {
    const job = { id: "j1", company: "X", userId: "u1" };
    prismaMock.job.findFirst.mockResolvedValue(job);

    const result = await getJobById("u1", "j1");

    expect(result).toEqual(job);
  });

  it("updateJob loads job then updates and records history on status change", async () => {
    const existing = { id: "j1", userId: "u1", status: "applied" };
    prismaMock.job.findFirst.mockResolvedValue(existing);
    prismaMock.job.update.mockResolvedValue({ ...existing, status: "interviewing" });

    const result = await updateJob("u1", "j1", { status: "interviewing" });

    expect(prismaMock.job.update).toHaveBeenCalledWith({
      where: { id: "j1" },
      data: { status: "interviewing" },
    });
    expect(prismaMock.statusHistory.create).toHaveBeenCalledWith({
      data: { jobId: "j1", status: "interviewing" },
    });
    expect(result.status).toBe("interviewing");
  });

  it("updateJob does not write history when status is unchanged", async () => {
    const existing = { id: "j1", userId: "u1", status: "applied" };
    prismaMock.job.findFirst.mockResolvedValue(existing);
    prismaMock.job.update.mockResolvedValue({ ...existing, notes: "updated" });

    await updateJob("u1", "j1", { notes: "updated" });

    expect(prismaMock.statusHistory.create).not.toHaveBeenCalled();
  });

  it("updateJob does not write history when status value is identical", async () => {
    const existing = { id: "j1", userId: "u1", status: "applied" };
    prismaMock.job.findFirst.mockResolvedValue(existing);
    prismaMock.job.update.mockResolvedValue(existing);

    await updateJob("u1", "j1", { status: "applied" });

    expect(prismaMock.statusHistory.create).not.toHaveBeenCalled();
  });

  it("deleteJob loads job then deletes", async () => {
    prismaMock.job.findFirst.mockResolvedValue({ id: "j1", userId: "u1" });
    prismaMock.job.delete.mockResolvedValue(undefined);

    await deleteJob("u1", "j1");

    expect(prismaMock.job.delete).toHaveBeenCalledWith({ where: { id: "j1" } });
  });

  describe("getFunnelMetrics", () => {
    it("scopes the groupBy to the user and the three funnel stages", async () => {
      prismaMock.job.groupBy.mockResolvedValue([]);

      await getFunnelMetrics("u1");

      expect(prismaMock.job.groupBy).toHaveBeenCalledWith({
        by: ["status"],
        where: {
          userId: "u1",
          status: { in: ["applied", "interviewing", "offer"] },
        },
        _count: { _all: true },
      });
    });

    it("returns Recharts-ready stages with drop-off and conversion percents", async () => {
      prismaMock.job.groupBy.mockResolvedValue([
        { status: "applied", _count: { _all: 100 } },
        { status: "interviewing", _count: { _all: 40 } },
        { status: "offer", _count: { _all: 10 } },
      ]);

      const result = await getFunnelMetrics("u1");

      expect(result.stages.map((s) => s.name)).toEqual([
        "Applied",
        "Interview",
        "Offer",
      ]);
      expect(result.stages.map((s) => s.value)).toEqual([100, 40, 10]);
      expect(result.stages[0]).toMatchObject({
        dropOff: 0,
        dropOffPercent: 0,
        conversionPercent: 100,
      });
      expect(result.stages[1]).toMatchObject({
        dropOff: 60,
        dropOffPercent: 60,
        conversionPercent: 40,
      });
      expect(result.stages[2]).toMatchObject({
        dropOff: 30,
        dropOffPercent: 75,
        conversionPercent: 25,
      });
      expect(result.totals).toEqual({ applied: 100, interviewing: 40, offer: 10 });
      expect(result.overallConversionPercent).toBe(10);
    });

    it("handles missing stages with zero counts and avoids divide-by-zero", async () => {
      prismaMock.job.groupBy.mockResolvedValue([
        { status: "applied", _count: { _all: 0 } },
      ]);

      const result = await getFunnelMetrics("u1");

      expect(result.stages.map((s) => s.value)).toEqual([0, 0, 0]);
      expect(result.stages.every((s) => s.dropOffPercent === 0)).toBe(true);
      expect(result.overallConversionPercent).toBe(0);
    });
  });

  describe("getTimeAppliedToInterview", () => {
    it("scopes the findMany to the user and includes status history", async () => {
      prismaMock.job.findMany.mockResolvedValue([]);

      await getTimeAppliedToInterview("u1");

      expect(prismaMock.job.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        select: {
          id: true,
          company: true,
          role: true,
          statusHistory: {
            select: { status: true, changedAt: true },
            orderBy: { changedAt: "asc" },
          },
        },
      });
    });

    it("computes the average days between Applied and Interview per job", async () => {
      prismaMock.job.findMany.mockResolvedValue([
        {
          id: "j1",
          company: "Acme",
          role: "Engineer",
          statusHistory: [
            { status: "applied", changedAt: new Date("2026-01-01T00:00:00Z") },
            { status: "interviewing", changedAt: new Date("2026-01-06T00:00:00Z") },
          ],
        },
        {
          id: "j2",
          company: "Initech",
          role: "Dev",
          statusHistory: [
            { status: "applied", changedAt: new Date("2026-01-01T00:00:00Z") },
            { status: "interviewing", changedAt: new Date("2026-01-11T00:00:00Z") },
            { status: "offer", changedAt: new Date("2026-01-20T00:00:00Z") },
          ],
        },
        {
          id: "j3",
          company: "StillWaiting",
          role: "QA",
          statusHistory: [
            { status: "applied", changedAt: new Date("2026-01-01T00:00:00Z") },
          ],
        },
      ]);

      const result = await getTimeAppliedToInterview("u1");

      expect(result.stage).toBe("applied_to_interviewing");
      expect(result.sampleSize).toBe(2);
      expect(result.averageDays).toBe(7.5);
      expect(result.minDays).toBe(5);
      expect(result.maxDays).toBe(10);
      expect(result.transitions).toEqual([
        { jobId: "j1", company: "Acme", role: "Engineer", days: 5 },
        { jobId: "j2", company: "Initech", role: "Dev", days: 10 },
      ]);
    });

    it("returns zeros when no job has both transitions", async () => {
      prismaMock.job.findMany.mockResolvedValue([
        {
          id: "j1",
          company: "Acme",
          role: "Engineer",
          statusHistory: [
            { status: "applied", changedAt: new Date("2026-01-01T00:00:00Z") },
          ],
        },
      ]);

      const result = await getTimeAppliedToInterview("u1");

      expect(result).toEqual({
        stage: "applied_to_interviewing",
        sampleSize: 0,
        averageDays: 0,
        minDays: 0,
        maxDays: 0,
        transitions: [],
      });
    });

    it("ignores interview entries that happened before the first applied entry", async () => {
      prismaMock.job.findMany.mockResolvedValue([
        {
          id: "j1",
          company: "Acme",
          role: "Engineer",
          statusHistory: [
            { status: "interviewing", changedAt: new Date("2025-12-30T00:00:00Z") },
            { status: "applied", changedAt: new Date("2026-01-01T00:00:00Z") },
          ],
        },
      ]);

      const result = await getTimeAppliedToInterview("u1");

      expect(result.sampleSize).toBe(0);
      expect(result.averageDays).toBe(0);
    });
  });
});
