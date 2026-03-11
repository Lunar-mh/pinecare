'use strict';

const DEFAULT_SUNSET = 'Tue, 30 Jun 2026 23:59:59 GMT';

function resolveSuccessorPath(successorPath, req) {
  if (typeof successorPath === 'function') {
    return successorPath(req);
  }
  return successorPath;
}

function deprecatedRoute(successorPath, options = {}) {
  const sunset = options.sunset || DEFAULT_SUNSET;
  const baseMessage = options.message;

  return (req, res, next) => {
    const resolvedSuccessorPath = resolveSuccessorPath(successorPath, req);
    const message = baseMessage || `Deprecated API, migrate to ${resolvedSuccessorPath}.`;

    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunset);
    res.setHeader('Warning', `299 - "${message}"`);

    if (resolvedSuccessorPath) {
      res.setHeader('Link', `<${resolvedSuccessorPath}>; rel="successor-version"`);
    }

    next();
  };
}

module.exports = {
  deprecatedRoute,
};
