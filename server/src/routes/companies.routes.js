const express = require("express");
const { verifyCompanyHandler } = require("../controllers/companies.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/verify", verifyCompanyHandler);

module.exports = router;
