'use strict';

const MODES = {
  COMPETITION_SANDBOX: 'COMPETITION_SANDBOX',
  PRODUCTION_LIVE: 'PRODUCTION_LIVE',
};

function normalizeBoolean(raw) {
  const value = String(raw || '')
    .trim()
    .toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function resolveMode() {
  if (normalizeBoolean(process.env.PRODUCTION_LIVE)) {
    return MODES.PRODUCTION_LIVE;
  }

  if (normalizeBoolean(process.env.COMPETITION_SANDBOX)) {
    return MODES.COMPETITION_SANDBOX;
  }

  const runtimeMode = String(process.env.RUNTIME_MODE || '')
    .trim()
    .toUpperCase();
  if (runtimeMode === MODES.PRODUCTION_LIVE) return MODES.PRODUCTION_LIVE;
  if (runtimeMode === MODES.COMPETITION_SANDBOX) return MODES.COMPETITION_SANDBOX;

  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    return MODES.PRODUCTION_LIVE;
  }

  return MODES.COMPETITION_SANDBOX;
}

function applyRuntimeModeEnv() {
  const mode = resolveMode();

  process.env.RUNTIME_MODE = mode;
  process.env.PRODUCTION_LIVE = mode === MODES.PRODUCTION_LIVE ? '1' : '0';
  process.env.COMPETITION_SANDBOX = mode === MODES.COMPETITION_SANDBOX ? '1' : '0';

  return mode;
}

function isProductionLive() {
  return resolveMode() === MODES.PRODUCTION_LIVE;
}

function isCompetitionSandbox() {
  return resolveMode() === MODES.COMPETITION_SANDBOX;
}

module.exports = {
  MODES,
  normalizeBoolean,
  resolveMode,
  applyRuntimeModeEnv,
  isProductionLive,
  isCompetitionSandbox,
};
