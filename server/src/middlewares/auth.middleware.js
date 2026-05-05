const HttpError = require("../utils/httpError");
const { verifyToken } = require("../utils/token");

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing or invalid authorization header");
  }

  const token = authHeader.split(" ")[1]?.trim();
  if (!token) {
    throw new HttpError(401, "Missing or invalid authorization header");
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      throw new HttpError(
        401,
        "Invalid session. Sign in again. If you recently changed JWT_SECRET, old tokens are rejected."
      );
    }
    if (err.name === "TokenExpiredError") {
      throw new HttpError(401, "Session expired. Please sign in again.");
    }
    throw err;
  }

  req.user = {
    id: decoded.userId,
    email: decoded.email,
  };

  next();
}

module.exports = authMiddleware;
