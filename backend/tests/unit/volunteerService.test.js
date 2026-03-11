'use strict';

jest.mock('../../src/models/volunteerModel', () => ({
  listTasksByVolunteer: jest.fn(),
  countTasksByVolunteer: jest.fn(),
  countTaskSummary: jest.fn(),
  findProfileByUserId: jest.fn(),
  listTrainingByVolunteerId: jest.fn(),
  countTrainingByVolunteerId: jest.fn(),
  findTaskByIdForVolunteer: jest.fn(),
  acceptTask: jest.fn(),
  updateOwnedTaskStatus: jest.fn(),
  upsertAttendance: jest.fn(),
}));

jest.mock('../../src/models/auditLog', () => ({
  create: jest.fn(),
}));

const volunteerModel = require('../../src/models/volunteerModel');
const AuditLogModel = require('../../src/models/auditLog');
const volunteerService = require('../../src/services/volunteerService');

describe('volunteerService', () => {
  const scope = {
    userId: 88,
    communityId: 9,
    role: 'volunteer',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paged task list with summary', async () => {
    volunteerModel.listTasksByVolunteer.mockResolvedValue([{ id: 1 }]);
    volunteerModel.countTasksByVolunteer.mockResolvedValue(1);
    volunteerModel.countTaskSummary.mockResolvedValue({
      available_count: 2,
      assigned_count: 1,
      processing_count: 0,
      completed_count: 3,
    });

    const result = await volunteerService.getTasks(scope, {
      page: '0',
      page_size: '200',
      keyword: 'escort',
    });

    expect(volunteerModel.listTasksByVolunteer).toHaveBeenCalledWith(
      scope,
      { status: '', keyword: 'escort' },
      { page: 1, pageSize: 100 }
    );
    expect(result.pagination.total).toBe(1);
    expect(result.summary.completed_count).toBe(3);
  });

  it('rejects accepting non-pending task', async () => {
    volunteerModel.findTaskByIdForVolunteer.mockResolvedValue({
      id: 12,
      volunteer_id: null,
      status: 'assigned',
    });

    await expect(volunteerService.acceptTask(scope, 12)).rejects.toMatchObject({
      code: 409,
    });
  });

  it('accepts pending task and binds current volunteer', async () => {
    volunteerModel.findTaskByIdForVolunteer.mockResolvedValue({
      id: 12,
      volunteer_id: null,
      status: 'pending',
    });
    volunteerModel.acceptTask.mockResolvedValue({ affectedRows: 1 });
    AuditLogModel.create.mockResolvedValue(1);

    const result = await volunteerService.acceptTask(scope, 12);

    expect(volunteerModel.acceptTask).toHaveBeenCalledWith(12, scope);
    expect(result).toMatchObject({
      task_id: 12,
      status: 'assigned',
      volunteer_id: 88,
    });
  });

  it('checks in assigned task and records attendance', async () => {
    volunteerModel.findTaskByIdForVolunteer.mockResolvedValue({
      id: 12,
      volunteer_id: 88,
      status: 'assigned',
    });
    volunteerModel.updateOwnedTaskStatus.mockResolvedValue({ affectedRows: 1 });
    volunteerModel.upsertAttendance.mockResolvedValue({ affectedRows: 1 });
    AuditLogModel.create.mockResolvedValue(1);

    const result = await volunteerService.checkInTask(scope, 12);

    expect(volunteerModel.updateOwnedTaskStatus).toHaveBeenCalledWith(12, 88, 'processing');
    expect(volunteerModel.upsertAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 12,
        communityId: 9,
        volunteerUserId: 88,
        checkInAt: expect.any(String),
      })
    );
    expect(result.status).toBe('processing');
  });

  it('completes owned task and closes attendance', async () => {
    volunteerModel.findTaskByIdForVolunteer.mockResolvedValue({
      id: 15,
      volunteer_id: 88,
      status: 'processing',
    });
    volunteerModel.updateOwnedTaskStatus.mockResolvedValue({ affectedRows: 1 });
    volunteerModel.upsertAttendance.mockResolvedValue({ affectedRows: 1 });
    AuditLogModel.create.mockResolvedValue(1);

    const result = await volunteerService.completeTask(scope, 15);

    expect(volunteerModel.updateOwnedTaskStatus).toHaveBeenCalledWith(
      15,
      88,
      'completed',
      expect.objectContaining({
        completedAt: expect.any(String),
      })
    );
    expect(result.status).toBe('completed');
    expect(result.completed_at).toEqual(expect.any(String));
  });

  it('returns volunteer training records', async () => {
    volunteerModel.listTrainingByVolunteerId.mockResolvedValue([{ id: 3 }]);
    volunteerModel.countTrainingByVolunteerId.mockResolvedValue(1);

    const result = await volunteerService.getTraining(scope, {
      status: 'completed',
      page: '1',
      page_size: '10',
    });

    expect(volunteerModel.listTrainingByVolunteerId).toHaveBeenCalledWith(
      scope,
      { status: 'completed' },
      { page: 1, pageSize: 10 }
    );
    expect(result.pagination.total).toBe(1);
  });
});
