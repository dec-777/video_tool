const { normalizeError } = require("../services/errorService");

function ok(data = {}) {
  return {
    success: true,
    data
  };
}

function fail(error) {
  const normalized = normalizeError(error);

  return {
    success: false,
    error: normalized
  };
}

async function withIpcResult(handler) {
  try {
    const data = await handler();
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

module.exports = {
  fail,
  ok,
  withIpcResult
};
