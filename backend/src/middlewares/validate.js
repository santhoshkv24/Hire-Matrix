const HttpError = require("../utils/httpError");

const validate = (schema, source = "body") => {
  return (req, _res, next) => {
    const target = req[source];
    const parsed = schema.safeParse(target);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      return next(new HttpError(400, "Validation failed", details));
    }

    req[source] = parsed.data;
    return next();
  };
};

module.exports = validate;