import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { searchCompanies } from "../services/companiesApi.js";

/**
 * Debounced company search hook backed by our /api/companies/verify proxy.
 *
 * Returns:
 *   { results, isLoading, error, hasSearched }
 *
 * Behavior:
 *   - Debounces the input by `delay` ms (default 400) before hitting the API.
 *   - Cancels in-flight requests when the query changes again, so the user
 *     never sees "stale" results from an older keystroke.
 *   - `hasSearched` flips true once the first debounced lookup completes —
 *     useful for distinguishing "not searched yet" from "searched, found 0"
 *     in the UI (e.g. "Company not found" should only show after a search).
 */
export function useCompanySearch(query, { delay = 400, minLength = 2 } = {}) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // We track abort + timer in refs so re-renders never cancel the wrong job.
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const trimmed = String(query || "").trim();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (trimmed.length < minLength) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      setHasSearched(false);
      return undefined;
    }

    setIsLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const data = await searchCompanies(trimmed, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResults(data);
          setHasSearched(true);
        }
      } catch (err) {
        if (axios.isCancel(err) || err?.name === "CanceledError") {
          return;
        }
        if (!controller.signal.aborted) {
          setResults([]);
          setHasSearched(true);
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Company lookup failed."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [query, delay, minLength]);

  return { results, isLoading, error, hasSearched };
}
