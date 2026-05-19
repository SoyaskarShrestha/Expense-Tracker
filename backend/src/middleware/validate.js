const REQUEST_PARTS = ['params', 'query', 'body'];

function formatIssues(part, issues) {
  return issues.map((issue) => ({
    source: part,
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export function validate(schemas, options = {}) {
  return function validationMiddleware(req, res, next) {
    const errors = [];

    for (const part of REQUEST_PARTS) {
      const schema = schemas?.[part];
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        errors.push(...formatIssues(part, result.error.issues));
        continue;
      }

      req[part] = result.data;
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: options.message || 'Validation failed',
        errors,
      });
    }

    return next();
  };
}
