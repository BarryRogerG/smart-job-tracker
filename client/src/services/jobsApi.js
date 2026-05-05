import apiClient from "./apiClient";

export async function getJobs() {
  const response = await apiClient.get("/jobs");
  return response.data;
}

export async function createJob(payload) {
  const response = await apiClient.post("/jobs", payload);
  return response.data;
}

export async function updateJob(id, payload) {
  const response = await apiClient.patch(`/jobs/${id}`, payload);
  return response.data;
}

export async function deleteJob(id) {
  await apiClient.delete(`/jobs/${id}`);
}

export async function getTimeInStatusMetrics() {
  const response = await apiClient.get("/jobs/metrics/time-in-status");
  return response.data;
}
