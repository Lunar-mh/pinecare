'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const timeBankService = require('../services/timeBankService');
const { deprecatedRoute } = require('../utils/deprecation');

const router = express.Router();
router.use(deprecatedRoute('/time-bank'));

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function handleError(res, err) {
  if (err && (err.code || err.statusCode)) {
    const code = err.code || err.statusCode;
    const status = err.statusCode || code;
    return fail(res, code, err.message, err.data || null, status);
  }
  return fail(res, 500, 'Internal server error.', null, 500);
}

router.get('/account', auth, async (req, res) => {
  try {
    const data = await timeBankService.getAccount(req.user.userId);
    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/services', auth, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);

    const data = await timeBankService.getServiceHistory(
      req.user.userId,
      req.query.type || 'provided',
      page,
      pageSize
    );

    const pagination = data.pagination || { total: data.list.length, page, pageSize };

    return ok(
      res,
      {
        list: data.list,
        total: pagination.total,
        page: pagination.page,
        pageSize: pagination.pageSize,
      },
      'ok'
    );
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/services', auth, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.recipientId || !body.type) {
      return fail(res, 422, 'recipientId and type are required.', null, 422);
    }

    const data = await timeBankService.recordService(req.user.userId, {
      recipientId: body.recipientId,
      type: body.type,
      duration: body.duration,
      startTime: body.startTime,
      endTime: body.endTime,
      locationHash: body.locationHash,
    });

    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/services/:id/accept', auth, async (req, res) => {
  try {
    const recordId = parsePositiveInt(req.params.id);
    if (!recordId) {
      return fail(res, 400, 'Invalid record id.', null, 400);
    }

    const data = await timeBankService.confirmService(req.user.userId, {
      recordId,
      action: 'confirm',
      communityId: req.body && req.body.communityId,
    });

    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/services/:id/complete', auth, async (req, res) => {
  try {
    const recordId = parsePositiveInt(req.params.id);
    if (!recordId) {
      return fail(res, 400, 'Invalid record id.', null, 400);
    }

    const data = await timeBankService.confirmService(req.user.userId, {
      recordId,
      action: 'confirm',
      communityId: req.body && req.body.communityId,
    });

    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/transactions', auth, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);

    const all = await timeBankService.getExchangeHistory(req.user.userId);
    const offset = (page - 1) * pageSize;
    const list = all.slice(offset, offset + pageSize);

    return ok(
      res,
      {
        list,
        total: all.length,
        page,
        pageSize,
      },
      'ok'
    );
  } catch (err) {
    return handleError(res, err);
  }
});

module.exports = router;
