const express = require("express");
const {
  createJobHandler,
  listJobsHandler,
  getJobByIdHandler,
  updateJobHandler,
  deleteJobHandler,
  getFunnelMetricsHandler,
  getTimeInStatusHandler,
} = require("../controllers/job.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  createJobSchema,
  updateJobSchema,
  getOrDeleteJobSchema,
} = require("../validators/job.validator");

const router = express.Router();

router.use(authMiddleware);

router.get("/", listJobsHandler);
router.get("/metrics/funnel", getFunnelMetricsHandler);
router.get("/metrics/time-in-status", getTimeInStatusHandler);
router.post("/", validate(createJobSchema), createJobHandler);
router.get("/:id", validate(getOrDeleteJobSchema), getJobByIdHandler);
router.patch("/:id", validate(updateJobSchema), updateJobHandler);
router.delete("/:id", validate(getOrDeleteJobSchema), deleteJobHandler);

module.exports = router;
