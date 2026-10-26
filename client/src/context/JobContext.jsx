import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createJob as apiCreateJob,
  deleteJob as apiDeleteJob,
  getJobs,
  updateJob as apiUpdateJob,
} from "../services/jobsApi.js";
import { useAuth } from "./AuthContext.jsx";

const JobsStateContext = createContext(null);
const JobsDispatchContext = createContext(null);
const DELETED_ITEMS_STORAGE_KEY = "sjt_deleted_items_v1";
const JOBS_QUERY_KEY = "jobs";

function jobsQueryKey(token) {
  return [JOBS_QUERY_KEY, token || "anonymous"];
}

function normalizeJobPayload(payload) {
  const normalizedLink = String(payload.link || "").trim();
  const normalizedAppliedDate = payload.appliedDate
    ? new Date(payload.appliedDate).toISOString()
    : new Date().toISOString();

  return {
    normalizedLink,
    normalizedAppliedDate,
    normalizedPayload: {
      ...payload,
      link: normalizedLink || undefined,
      appliedDate: normalizedAppliedDate,
    },
  };
}

export function JobProvider({ children }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [deletedItems, setDeletedItems] = useState(() => {
    try {
      const raw = window.localStorage.getItem(DELETED_ITEMS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const currentJobsQueryKey = useMemo(() => jobsQueryKey(token), [token]);

  const jobsQuery = useQuery({
    queryKey: currentJobsQueryKey,
    queryFn: getJobs,
    enabled: Boolean(token),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, requestError) => {
      if (requestError?.response?.status === 401) return false; // Don't retry if the user is unauthorized; they need to log in again.
      return failureCount < 1;
    },
  });

  useEffect(() => {
    if (!token) {
      setError("");
      return;
    }
    if (!jobsQuery.error) return;
    if (jobsQuery.error.response?.status === 401) return;
    setError(jobsQuery.error.response?.data?.message || "Failed to load jobs");
  }, [token, jobsQuery.error]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DELETED_ITEMS_STORAGE_KEY,
        JSON.stringify(deletedItems)
      );
    } catch {
      // localStorage can fail in private/incognito modes; safe to ignore.
    }
  }, [deletedItems]);

  const setCachedJobs = useCallback(
    (updater) => {
      queryClient.setQueryData(currentJobsQueryKey, (prev) => {
        const current = Array.isArray(prev) ? prev : [];
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [queryClient, currentJobsQueryKey]
  );

  const createJobMutation = useMutation({
    mutationFn: async (payload) => {
      const { normalizedPayload } = normalizeJobPayload(payload);
      return apiCreateJob(normalizedPayload);
    },
    onMutate: async (payload) => {
      const { normalizedLink, normalizedAppliedDate } = normalizeJobPayload(payload);
      if (normalizedLink) {
        try {
          new URL(normalizedLink);
        } catch {
          throw new Error("Please provide a valid URL");
        }
      }

      await queryClient.cancelQueries({ queryKey: currentJobsQueryKey });
      const previousJobs = queryClient.getQueryData(currentJobsQueryKey) || [];
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticJob = {
        id: optimisticId,
        company: payload.company,
        role: payload.role,
        status: payload.status || "applied",
        appliedDate: normalizedAppliedDate,
        notes: payload.notes || "",
        link: normalizedLink,
      };

      setCachedJobs((prev) => [optimisticJob, ...prev]);
      return { previousJobs, optimisticId };
    },
    onSuccess: (newJob, _payload, context) => {
      setCachedJobs((prev) =>
        prev.map((job) => (job.id === context?.optimisticId ? newJob : job))
      );
    },
    onError: (requestError, _payload, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(currentJobsQueryKey, context.previousJobs);
      }

      if (requestError.response?.status === 401) return;
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        "Failed to create job";
      setError(message);
      setToast({ type: "error", message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: currentJobsQueryKey });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, body }) => apiUpdateJob(id, body),
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: currentJobsQueryKey });
      const previousJobs = queryClient.getQueryData(currentJobsQueryKey) || [];
      setCachedJobs((prev) =>
        prev.map((job) => (job.id === id ? { ...job, ...body } : job))
      );
      return { previousJobs };
    },
    onSuccess: (updated) => {
      setCachedJobs((prev) =>
        prev.map((job) => (job.id === updated.id ? updated : job))
      );
    },
    onError: (requestError, _variables, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(currentJobsQueryKey, context.previousJobs);
      }
      if (requestError.response?.status === 401) return;
      const message =
        requestError.response?.data?.message || "Failed to update job";
      setError(message);
      setToast({ type: "error", message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: currentJobsQueryKey });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: (job) => apiDeleteJob(job.id),
    onMutate: async (job) => {
      await queryClient.cancelQueries({ queryKey: currentJobsQueryKey });
      const previousJobs = queryClient.getQueryData(currentJobsQueryKey) || [];
      setCachedJobs((prev) =>
        prev.filter((item) => String(item.id) !== String(job.id))
      );
      return { previousJobs, job };
    },
    onSuccess: (_result, job) => {
      setDeletedItems((prev) => [
        {
          ...job,
          deletedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    onError: (requestError, _job, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(currentJobsQueryKey, context.previousJobs);
      }
      if (requestError.response?.status === 401) return;
      const message =
        requestError.response?.data?.message || "Failed to delete job";
      setError(message);
      setToast({ type: "error", message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: currentJobsQueryKey });
    },
  });

  const jobs = token ? jobsQuery.data || [] : [];
  const isLoading = token ? jobsQuery.isLoading : false;
  const isSubmitting = createJobMutation.isPending;

  // Every mutation verb follows the same shape: clear the stale error banner
  // (which lives outside React Query) and forward to mutateAsync. The optional
  // adapter reshapes caller args — e.g. updateJob takes `(id, body)` but the
  // mutation expects a single `{ id, body }` variable.
  const runMutation = (mutation, adapter) => async (...args) => {
    setError("");
    return mutation.mutateAsync(adapter ? adapter(...args) : args[0]);
  };

  const createJob = runMutation(createJobMutation);
  const updateJob = runMutation(updateJobMutation, (id, body) => ({ id, body }));
  const deleteJob = runMutation(deleteJobMutation);

  const clearError = useCallback(() => setError(""), []);
  const clearToast = useCallback(() => setToast(null), []);
  const clearDeletedItems = useCallback(() => setDeletedItems([]), []);
  const restoreInFlightRef = useRef(new Set());

  const restoreDeletedJob = useCallback(
    async (deletedJob) => {
      const deletedId = deletedJob?.id;
      if (deletedId == null || restoreInFlightRef.current.has(deletedId)) {
        return;
      }
      restoreInFlightRef.current.add(deletedId);

      try {
        // Trash is localStorage-only. Restore used to POST a new row even when
        // the original job was still on the server, which created duplicates.
        const liveJobs = await queryClient.fetchQuery({
          queryKey: currentJobsQueryKey,
          queryFn: getJobs,
        });
        const stillOnServer = (Array.isArray(liveJobs) ? liveJobs : []).some(
          (job) => String(job.id) === String(deletedId)
        );

        if (!stillOnServer) {
          await createJob({
            company: deletedJob.company,
            role: deletedJob.role,
            status: deletedJob.status,
            appliedDate: deletedJob.appliedDate
              ? new Date(deletedJob.appliedDate).toISOString()
              : new Date().toISOString(),
            notes: deletedJob.notes || "",
            link: deletedJob.link || undefined,
          });
        }

        setDeletedItems((prev) =>
          prev.filter((item) => String(item.id) !== String(deletedId))
        );
      } finally {
        restoreInFlightRef.current.delete(deletedId);
      }
    },
    [createJob, currentJobsQueryKey, queryClient]
  );

  const isMock = false;

  const stateValue = useMemo(
    () => ({
      jobs,
      deletedItems,
      isMock,
      error,
      toast,
      isLoading,
      isSubmitting,
    }),
    [jobs, deletedItems, error, toast, isLoading, isSubmitting]
  );

  const dispatchValue = useMemo(
    () => ({
      createJob,
      updateJob,
      deleteJob,
      clearError,
      clearToast,
      restoreDeletedJob,
      clearDeletedItems,
    }),
    [
      createJob,
      updateJob,
      deleteJob,
      clearError,
      clearToast,
      restoreDeletedJob,
      clearDeletedItems,
    ]
  );

  return (
    <JobsStateContext.Provider value={stateValue}>
      <JobsDispatchContext.Provider value={dispatchValue}>
        {children}
      </JobsDispatchContext.Provider>
    </JobsStateContext.Provider>
  );
}

export function useJobsState() {
  const context = useContext(JobsStateContext);
  if (!context) {
    throw new Error("useJobsState must be used within a JobProvider");
  }
  return context;
}

export function useJobsDispatch() {
  const context = useContext(JobsDispatchContext);
  if (!context) {
    throw new Error("useJobsDispatch must be used within a JobProvider");
  }
  return context;
}

// Backward-compatible hook while components migrate gradually.
export function useJobs() {
  return {
    ...useJobsState(),
    ...useJobsDispatch(),
  };
}
