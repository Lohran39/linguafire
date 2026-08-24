function createMonitoringService({ logger } = {}) {
  const startedAt = new Date();
  const counters = {
    totalRequests: 0,
    statusCodes: {},
    errors: 0,
    recentErrors: []
  };

  function recordRequest({ statusCode }) {
    const statusKey = String(statusCode || 0);
    counters.totalRequests += 1;
    counters.statusCodes[statusKey] = (counters.statusCodes[statusKey] || 0) + 1;

    if (Number(statusCode) >= 500) {
      counters.errors += 1;
    }
  }

  function recordError(error, req = {}) {
    counters.errors += 1;

    const entry = {
      at: new Date().toISOString(),
      method: req.method || null,
      path: req.path || null,
      message: error?.message || String(error || 'Erro desconhecido')
    };

    counters.recentErrors.unshift(entry);
    counters.recentErrors = counters.recentErrors.slice(0, 20);
    logger?.error?.('Unhandled route error', entry);
  }

  function snapshot() {
    return {
      started_at: startedAt.toISOString(),
      uptime_seconds: Math.round(process.uptime()),
      requests: {
        total: counters.totalRequests,
        by_status: { ...counters.statusCodes }
      },
      errors: {
        total: counters.errors,
        recent: counters.recentErrors.slice(0, 5)
      }
    };
  }

  return {
    recordRequest,
    recordError,
    snapshot
  };
}

module.exports = {
  createMonitoringService
};
