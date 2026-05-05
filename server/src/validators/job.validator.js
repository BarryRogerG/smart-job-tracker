const { z } = require("zod");

const jobStatusEnum = z.enum(["applied", "interviewing", "offer", "rejected"]);
const optionalUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().url("Please provide a valid URL").optional()
);

// Trim before validating so a string of whitespace can't sneak past the
// min-length check.
const trimmedNameSchema = (label) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1, `${label} is required`).max(150)
  );

// Brandfetch returns plain hostnames (e.g. "apple.com") and CDN-hosted icon
// URLs. We accept either a hostname or a full URL for the domain so callers
// can store whichever shape they have, but logos must be a real URL.
const optionalDomainSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().max(253).optional()
);

const createJobSchema = z.object({
  body: z.object({
    company: trimmedNameSchema("Company"),
    companyDomain: optionalDomainSchema,
    companyLogo: optionalUrlSchema,
    role: trimmedNameSchema("Role"),
    status: jobStatusEnum.default("applied"),
    appliedDate: z.coerce.date(),
    notes: z.string().max(5000).optional(),
    link: optionalUrlSchema,
  }),
});

const updateJobSchema = z.object({
  body: z.object({
    company: trimmedNameSchema("Company").optional(),
    companyDomain: optionalDomainSchema,
    companyLogo: optionalUrlSchema,
    role: trimmedNameSchema("Role").optional(),
    status: jobStatusEnum.optional(),
    appliedDate: z.coerce.date().optional(),
    notes: z.string().max(5000).optional(),
    link: optionalUrlSchema,
  }),
  params: z.object({
    id: z.string().min(1, "Job id is required"),
  }),
});

const getOrDeleteJobSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Job id is required"),
  }),
});

module.exports = {
  createJobSchema,
  updateJobSchema,
  getOrDeleteJobSchema,
};
