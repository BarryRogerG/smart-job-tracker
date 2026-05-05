function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  if (statusCode >= 500) {
    // Keep server errors visible in logs but avoid leaking details in response.
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return res.status(statusCode).json({
    message,
  });
}

module.exports = errorMiddleware;
