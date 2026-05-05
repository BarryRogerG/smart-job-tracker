import { useQuery } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import { getTimeInStatusMetrics } from "../services/jobsApi";
import { useAuth } from "../context/AuthContext.jsx";
import { useJobs } from "../context/JobContext.jsx";

function formatDays(value) {
  if (value == null) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

export default function TimeInStatusCard() {
  const { token } = useAuth();
  const { isMock } = useJobs();

  const enabled = Boolean(token) && !isMock;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["metrics", "time-in-status", token || "anonymous"],
    queryFn: getTimeInStatusMetrics,
    enabled,
    staleTime: 60_000,
    retry: (failureCount, requestError) => {
      if (requestError?.response?.status === 401) return false;
      return failureCount < 1;
    },
  });

  // In mock mode we have no real history data; render a friendly placeholder
  // so the layout stays consistent in the gallery view.
  if (isMock) {
    return (
      <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-md">
        <div className="flex items-center gap-2 text-text-body">
          <Clock3 size={18} className="text-blue-500" />
          <h2 className="text-lg font-medium">Applied → Interview velocity</h2>
        </div>
        <p className="mt-1 text-sm text-text-hint">
          Average days a job spends in the Applied stage before moving to
          Interview. Sign in with a real account to see live data.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-2 text-text-body">
        <Clock3 size={18} className="text-blue-500" />
        <h2 className="text-lg font-medium">Applied → Interview velocity</h2>
      </div>
      <p className="mt-1 text-sm text-text-hint">
        Average days a job spends in the Applied stage before it moves to
        Interview. Derived from the job status history log.
      </p>

      {isLoading ? (
        <div className="mt-5 h-20 animate-pulse rounded-lg bg-gray-100" />
      ) : isError ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error?.response?.data?.message ||
            "Failed to load time-in-status metrics."}
        </p>
      ) : (
        <>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-blue-700">
              {formatDays(data?.averageDays ?? 0)}
            </span>
            <span className="text-sm text-text-hint">
              avg. days{" "}
              <span className="text-text-hint">
                (n = {data?.sampleSize ?? 0})
              </span>
            </span>
          </div>

          {data?.sampleSize > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-hint">
                  Fastest transition
                </p>
                <p className="mt-1 text-lg font-semibold text-text-primary">
                  {formatDays(data.minDays)} days
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-hint">
                  Slowest transition
                </p>
                <p className="mt-1 text-lg font-semibold text-text-primary">
                  {formatDays(data.maxDays)} days
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-hint">
              No jobs have moved from Applied to Interview yet. Once a job&apos;s
              status changes, we&apos;ll track how long the transition took.
            </p>
          )}
        </>
      )}
    </div>
  );
}
