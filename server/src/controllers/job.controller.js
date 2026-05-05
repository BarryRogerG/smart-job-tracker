const {
  createJob,
  listJobs,
  getJobById,
  updateJob,
  deleteJob,
  getFunnelMetrics,
  getTimeAppliedToInterview,
} = require("../services/job.service");

async function createJobHandler(req, res) {
  const job = await createJob(req.user.id, req.validated.body);
  return res.status(201).json(job);
}

async function listJobsHandler(req, res) {
  const jobs = await listJobs(req.user.id);
  return res.status(200).json(jobs);
}

async function getJobByIdHandler(req, res) {
  const { id } = req.validated.params;
  const job = await getJobById(req.user.id, id);
  return res.status(200).json(job);
}

async function updateJobHandler(req, res) {
  const { id } = req.validated.params;
  const job = await updateJob(req.user.id, id, req.validated.body);
  return res.status(200).json(job);
}

async function deleteJobHandler(req, res) {
  const { id } = req.validated.params;
  await deleteJob(req.user.id, id);
  return res.status(204).send();
}

async function getFunnelMetricsHandler(req, res) {
  const metrics = await getFunnelMetrics(req.user.id);
  return res.status(200).json(metrics);
}

async function getTimeInStatusHandler(req, res) {
  const metrics = await getTimeAppliedToInterview(req.user.id);
  return res.status(200).json(metrics);
}

module.exports = {
  createJobHandler,
  listJobsHandler,
  getJobByIdHandler,
  updateJobHandler,
  deleteJobHandler,
  getFunnelMetricsHandler,
  getTimeInStatusHandler,
};
