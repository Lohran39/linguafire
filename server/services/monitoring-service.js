function createMonitoringService({ logger } = {}) {
  const startedAt = new Date();
  const counters = {
    totalRequests: 0,
    statusCodes: {},
    errors: 0,
    recentErrors: []
  };
  const durations = [];
  let unhandledErrors = 0;

  function recordRequest({ statusCode, durationMs }) {
    if (Number.isFinite(durationMs) && durationMs >= 0) {
      durations.push(durationMs);
      if (durations.length > 2000) durations.shift();
    }
    const statusKey = String(statusCode || 0);
    counters.totalRequests += 1;
    counters.statusCodes[statusKey] = (counters.statusCodes[statusKey] || 0) + 1;

    if (Number(statusCode) >= 500) {
      counters.errors += 1;
    }
  }

  function recordError(error, req = {}) {
    unhandledErrors += 1;

    const entry = {
      at: new Date().toISOString(),
      method: req.method || null,
      path: req.route?.path || 'unmatched',
      requestId: req.requestId || null,
      code: error?.code || 'unhandled_error'
    };

    counters.recentErrors.unshift(entry);
    counters.recentErrors = counters.recentErrors.slice(0, 20);
    logger?.error?.('Unhandled route error', entry);
  }

  function snapshot() {
    const sorted = [...durations].sort((a, b) => a - b);
    return {
      started_at: startedAt.toISOString(),
      uptime_seconds: Math.round(process.uptime()),
      requests: {
        total: counters.totalRequests,
        by_status: { ...counters.statusCodes }
      },
      errors: {
        total: counters.errors,
        unhandled: unhandledErrors,
        recent: counters.recentErrors.slice(0, 5)
      },
      latency_ms: { sample_size: sorted.length, window: 'last_2000_requests',
        p95: sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : 0 },
      scope: 'instance'
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
