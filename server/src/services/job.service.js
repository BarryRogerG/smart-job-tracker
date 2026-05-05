const prisma = require("../config/db");
const HttpError = require("../utils/httpError");

async function createJob(userId, payload) {
  const initialStatus = payload.status || "applied";

  // Nested write keeps the job row and its first history entry atomic.
  return prisma.job.create({
    data: {
      ...payload,
      status: initialStatus,
      userId,
      statusHistory: {
        create: { status: initialStatus },
      },
    },
  });
}

async function listJobs(userId) {
  return prisma.job.findMany({
    where: { userId },
    orderBy: { appliedDate: "desc" },
  });
}

async function getJobById(userId, id) {
  const job = await prisma.job.findFirst({
    where: { id, userId },
  });

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  return job;
}

async function updateJob(userId, id, payload) {
  const existing = await getJobById(userId, id);
  const statusChanged =
    Boolean(payload.status) && payload.status !== existing.status;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({
      where: { id },
      data: payload,
    });

    if (statusChanged) {
      await tx.statusHistory.create({
        data: { jobId: id, status: updated.status },
      });
    }

    return updated;
  });
}

async function deleteJob(userId, id) {
  await getJobById(userId, id);

  await prisma.job.delete({
    where: { id },
  });
}

// Recharts <Funnel> reads `value`; extra keys are kept for tooltip/labels.
const FUNNEL_STAGES = [
  { key: "applied", label: "Applied", fill: "#2563eb" },
  { key: "interviewing", label: "Interview", fill: "#f59e0b" },
  { key: "offer", label: "Offer", fill: "#16a34a" },
];

async function getFunnelMetrics(userId) {
  const grouped = await prisma.job.groupBy({
    by: ["status"],
    where: {
      userId,
      status: { in: FUNNEL_STAGES.map((stage) => stage.key) },
    },
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    grouped.map((row) => [row.status, row._count?._all ?? 0])
  );

  let previousCount = null;
  const stages = FUNNEL_STAGES.map((stage) => {
    const value = counts[stage.key] ?? 0;

    const dropOff = previousCount == null ? 0 : Math.max(previousCount - value, 0);
    const dropOffPercent =
      previousCount && previousCount > 0
        ? Math.round((dropOff / previousCount) * 1000) / 10
        : 0;
    const conversionPercent =
      previousCount && previousCount > 0
        ? Math.round((value / previousCount) * 1000) / 10
        : previousCount === 0
          ? 0
          : 100;

    previousCount = value;

    return {
      name: stage.label,
      stage: stage.key,
      value,
      fill: stage.fill,
      dropOff,
      dropOffPercent,
      conversionPercent,
    };
  });

  const total = stages[0]?.value ?? 0;
  const offer = stages[stages.length - 1]?.value ?? 0;
  const overallConversionPercent =
    total > 0 ? Math.round((offer / total) * 1000) / 10 : 0;

  return {
    stages,
    totals: {
      applied: counts.applied ?? 0,
      interviewing: counts.interviewing ?? 0,
      offer: counts.offer ?? 0,
    },
    overallConversionPercent,
  };
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function roundTo(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Average number of days a job spent in the "Applied" stage before moving to
 * "Interview" (status = "interviewing"). Only jobs that have BOTH an applied
 * entry and a later interviewing entry in their StatusHistory contribute to
 * the average; other jobs are excluded from the sample.
 */
async function getTimeAppliedToInterview(userId) {
  const jobs = await prisma.job.findMany({
    where: { userId },
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

  const transitions = [];

  for (const job of jobs) {
    const appliedEntry = job.statusHistory.find((h) => h.status === "applied");
    if (!appliedEntry) continue;

    const interviewEntry = job.statusHistory.find(
      (h) =>
        h.status === "interviewing" &&
        new Date(h.changedAt).getTime() >= new Date(appliedEntry.changedAt).getTime()
    );
    if (!interviewEntry) continue;

    const days =
      (new Date(interviewEntry.changedAt).getTime() -
        new Date(appliedEntry.changedAt).getTime()) /
      MS_PER_DAY;

    transitions.push({
      jobId: job.id,
      company: job.company,
      role: job.role,
      days: roundTo(days, 2),
    });
  }

  const sampleSize = transitions.length;
  const totalDays = transitions.reduce((sum, t) => sum + t.days, 0);
  const averageDays = sampleSize > 0 ? roundTo(totalDays / sampleSize, 1) : 0;
  const minDays =
    sampleSize > 0 ? roundTo(Math.min(...transitions.map((t) => t.days)), 1) : 0;
  const maxDays =
    sampleSize > 0 ? roundTo(Math.max(...transitions.map((t) => t.days)), 1) : 0;

  return {
    stage: "applied_to_interviewing",
    averageDays,
    sampleSize,
    minDays,
    maxDays,
    transitions,
  };
}

module.exports = {
  createJob,
  listJobs,
  getJobById,
  updateJob,
  deleteJob,
  getFunnelMetrics,
  getTimeAppliedToInterview,
};
