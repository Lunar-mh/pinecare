'use strict';

const validators = require('../../src/middleware/validateCommunityAdmin');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
}

function run(middleware, req) {
  const res = createRes();
  const next = jest.fn();
  middleware(req, res, next);
  return { res, next };
}

describe('validateCommunityAdmin middleware', () => {
  it('validates volunteer query pagination, role, and scope', () => {
    let result = run(validators.validateVolunteerQuery, {
      query: { page: '0' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.statusCode).toBe(400);
    expect(result.res.body.message).toBe('page must be a positive integer.');

    result = run(validators.validateVolunteerQuery, {
      query: { role: 'guest' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('Invalid role.');

    const req = {
      query: { community_id: '12' },
      body: {},
      adminScope: { isGlobalAdmin: true, communityId: null },
    };
    result = run(validators.validateVolunteerQuery, req);
    expect(result.next).toHaveBeenCalledTimes(1);
    expect(req.adminScope.communityId).toBe(12);

    result = run(validators.validateVolunteerQuery, {
      query: { community_id: '10' },
      body: {},
      adminScope: { communityId: 9, isGlobalAdmin: false },
    });
    expect(result.res.statusCode).toBe(403);
  });

  it('validates order ids and query filters', () => {
    let result = run(validators.validateOrderId, {
      params: { orderId: 'bad' },
    });
    expect(result.res.body.message).toBe('orderId must be a positive integer.');

    const req = {
      params: { orderId: '8' },
    };
    result = run(validators.validateOrderId, req);
    expect(result.next).toHaveBeenCalledTimes(1);
    expect(req.params.orderId).toBe('8');

    result = run(validators.validateOrderQuery, {
      query: { status: 'bad' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.statusCode).toBe(400);

    result = run(validators.validateOrderQuery, {
      query: { page_size: '10', status: 'pending' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.next).toHaveBeenCalledTimes(1);
  });

  it('validates create and assign order payloads', () => {
    let result = run(validators.validateCreateOrder, {
      body: {},
      query: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('service_type is required.');

    result = run(validators.validateCreateOrder, {
      body: { service_type: 'escort', elder_id: '0' },
      query: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('elder_id must be a positive integer.');

    result = run(validators.validateCreateOrder, {
      body: { service_type: 'escort', elder_id: '3', volunteer_id: 'bad' },
      query: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('volunteer_id must be a positive integer.');

    result = run(validators.validateCreateOrder, {
      body: { service_type: 'escort', elder_id: '3', status: 'bad' },
      query: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.statusCode).toBe(400);

    const req = {
      body: { service_type: 'escort', elder_id: '3', volunteer_id: '7', status: 'pending' },
      query: {},
      adminScope: { isGlobalAdmin: true, communityId: null },
    };
    result = run(validators.validateCreateOrder, req);
    expect(result.next).toHaveBeenCalledTimes(1);

    result = run(validators.validateAssignOrder, {
      body: { volunteer_id: 'bad' },
    });
    expect(result.res.body.message).toBe('volunteer_id must be a positive integer.');

    result = run(validators.validateAssignOrder, {
      body: { volunteer_id: '3', scheduled_at: 'nope' },
    });
    expect(result.res.body.message).toBe('Invalid scheduled_at.');

    result = run(validators.validateAssignOrder, {
      body: { volunteer_id: '3', scheduled_at: '2026-03-11T10:00:00Z' },
    });
    expect(result.next).toHaveBeenCalledTimes(1);
  });

  it('validates order status update payloads', () => {
    let result = run(validators.validateUpdateOrderStatus, {
      body: { status: 'assigned' },
    });
    expect(result.res.statusCode).toBe(400);

    result = run(validators.validateUpdateOrderStatus, {
      body: { status: 'completed', reason: 123 },
    });
    expect(result.res.body.message).toBe('reason must be a string.');

    result = run(validators.validateUpdateOrderStatus, {
      body: { status: 'cancelled', reason: 'done' },
    });
    expect(result.next).toHaveBeenCalledTimes(1);
  });

  it('validates stats, health overview, and medication log filters', () => {
    let result = run(validators.validateStatsQuery, {
      query: { start_date: 'bad' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('Invalid start_date.');

    result = run(validators.validateStatsQuery, {
      query: { start_date: '2026-03-12', end_date: '2026-03-11' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('start_date cannot be later than end_date.');

    result = run(validators.validateHealthOverviewQuery, {
      query: { pageSize: '100' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.next).toHaveBeenCalledTimes(1);

    result = run(validators.validateMedicationLogsQuery, {
      query: { status: 'weird' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('status is invalid.');

    result = run(validators.validateMedicationLogsQuery, {
      query: { status: 'pending', startDate: '2026-03-11', endDate: '2026-03-12' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.next).toHaveBeenCalledTimes(1);
  });

  it('validates gps, sos, and fall inputs', () => {
    let result = run(validators.validateGpsTrailQuery, {
      query: { userId: '0' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('userId must be a positive integer.');

    result = run(validators.validateGpsTrailQuery, {
      query: { userId: '1', startDate: '2026-03-11', endDate: '2026-03-12', limit: '50' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.next).toHaveBeenCalledTimes(1);

    result = run(validators.validateSosEventQuery, {
      query: { status: 'unknown' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('status is invalid.');

    result = run(validators.validateUpdateSosEventStatus, {
      body: { status: 'pending' },
    });
    expect(result.res.body.message).toBe('status must be one of: confirmed, resolved, cancelled.');
  });

  it('covers remaining community admin validator branches', () => {
    let result = run(validators.validateVolunteerQuery, {
      query: { community_id: 'bad' },
      body: {},
      adminScope: { isGlobalAdmin: true, communityId: null },
    });
    expect(result.res.body.message).toBe('community_id must be a positive integer.');

    result = run(validators.validateStatsQuery, {
      query: { end_date: 'bad' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('Invalid end_date.');

    result = run(validators.validateMedicationLogsQuery, {
      query: { startDate: 'bad' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('startDate is invalid.');

    result = run(validators.validateMedicationLogsQuery, {
      query: { endDate: 'bad' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('endDate is invalid.');

    result = run(validators.validateMedicationLogId, {
      params: { logId: 'bad' },
    });
    expect(result.res.body.message).toBe('logId must be a positive integer.');

    result = run(validators.validateMedicationLogId, {
      params: { logId: '5' },
    });
    expect(result.next).toHaveBeenCalledTimes(1);

    result = run(validators.validateMedicationLogStatus, {
      body: { status: 'odd' },
    });
    expect(result.res.body.message).toBe('status must be one of: pending, taken, skipped, missed.');

    result = run(validators.validateMedicationLogStatus, {
      body: { status: 'taken' },
    });
    expect(result.next).toHaveBeenCalledTimes(1);

    result = run(validators.validateGpsCurrentQuery, {
      query: { page: '0' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('page must be a positive integer.');

    result = run(validators.validateGpsCurrentQuery, {
      query: { community_id: '10' },
      body: {},
      adminScope: { communityId: 9, isGlobalAdmin: false },
    });
    expect(result.res.statusCode).toBe(403);

    result = run(validators.validateGpsTrailQuery, {
      query: { userId: '1', startDate: 'bad' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('startDate is invalid.');

    result = run(validators.validateGpsTrailQuery, {
      query: { userId: '1', startDate: '2026-03-12', endDate: 'bad' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('endDate is invalid.');

    result = run(validators.validateGpsTrailQuery, {
      query: { userId: '1', startDate: '2026-03-12', endDate: '2026-03-11' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('endDate must be >= startDate.');

    result = run(validators.validateGpsTrailQuery, {
      query: { userId: '1', startDate: '2026-03-11', endDate: '2026-03-12', limit: '5001' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('limit must be in 1-5000.');

    result = run(validators.validateFamilyBindingsQuery, {
      query: { community_id: '10' },
      body: {},
      adminScope: { communityId: 9, isGlobalAdmin: false },
    });
    expect(result.res.statusCode).toBe(403);

    result = run(validators.validateSosEventId, {
      params: { eventId: 'bad' },
    });
    expect(result.res.body.message).toBe('eventId must be a positive integer.');

    result = run(validators.validateSosEventId, {
      params: { eventId: '12' },
    });
    expect(result.next).toHaveBeenCalledTimes(1);

    result = run(validators.validateUpdateSosEventStatus, {
      body: { status: 'confirmed', reason: 123 },
    });
    expect(result.res.body.message).toBe('reason must be a string.');

    result = run(validators.validateFallEventsQuery, {
      query: { status: 'weird' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.res.body.message).toBe('status is invalid.');

    result = run(validators.validateFallEventsQuery, {
      query: { status: 'confirmed', page: '1' },
      body: {},
      adminScope: { communityId: 9 },
    });
    expect(result.next).toHaveBeenCalledTimes(1);
  });
});
