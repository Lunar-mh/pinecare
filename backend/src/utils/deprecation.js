'use strict';

const DEFAULT_SUNSET = 'Tue, 30 Jun 2026 23:59:59 GMT';

function deprecatedRoute(successorPath, options = {}) {
  const sunset = options.sunset || DEFAULT_SUNSET;
  const message = options.message || `Deprecated API, migrate to ${successorPath}.`;

  return (_req, res, next) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunset);
    res.setHeader('Warning', `299 - "${message}"`);

    if (successorPath) {
      res.setHeader('Link', `<${successorPath}>; rel="successor-version"`);
    }

    next();
  };
}

module.exports = {
  deprecatedRoute,
};
