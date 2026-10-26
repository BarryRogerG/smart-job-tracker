import { useCallback, useState } from "react";

const JOBS_VIEW_STORAGE_KEY = "sjt_jobs_view_v1";
const VALID_VIEWS = new Set(["list", "kanban"]);

function readStoredView() {
  try {
    const stored = window.localStorage.getItem(JOBS_VIEW_STORAGE_KEY);
    return VALID_VIEWS.has(stored) ? stored : "list";
  } catch {
    return "list";
  }
}

/**
 * Persists the user's List / Kanban preference across sessions.
 */
export function useJobsViewPreference() {
  const [jobsView, setJobsViewState] = useState(readStoredView);

  const setJobsView = useCallback((next) => {
    setJobsViewState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      if (!VALID_VIEWS.has(value)) return prev;
      try {
        window.localStorage.setItem(JOBS_VIEW_STORAGE_KEY, value);
      } catch {
        // localStorage can fail in private/incognito modes; safe to ignore.
      }
      return value;
    });
  }, []);

  return [jobsView, setJobsView];
}
