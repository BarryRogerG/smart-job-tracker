import apiClient from "./apiClient";

/**
 * Calls our backend's /companies/verify proxy and returns the array of
 * normalized matches. The proxy already filters out malformed entries, so
 * results here are safe to render directly.
 */
export async function searchCompanies(name, { signal } = {}) {
  const response = await apiClient.get("/companies/verify", {
    params: { name },
    signal,
  });
  return Array.isArray(response.data?.results) ? response.data.results : [];
}
