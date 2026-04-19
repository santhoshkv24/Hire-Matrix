const User = require("../models/User");
const HttpError = require("../utils/httpError");
const { verifyAccessToken } = require("../utils/jwt");

const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      throw new HttpError(401, "Authentication required");
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).populate("roles");

    if (!user || !user.isActive) {
      throw new HttpError(401, "Invalid user session");
    }

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((role) => role.key),
    };

    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, "Authentication required"));
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return next(new HttpError(403, "Insufficient permissions"));
    }

    return next();
  };
};

module.exports = {
  authenticate,
  authorize,
};