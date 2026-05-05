const HttpError = require("../utils/httpError");

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      throw new HttpError(400, firstIssue?.message || "Invalid request");
    }

    req.validated = result.data;
    next();
  };
}

module.exports = validate;
