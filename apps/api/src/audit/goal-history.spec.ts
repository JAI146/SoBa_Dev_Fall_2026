import { AuditService, goalHistoryState } from './audit.service';
import { AuditAction } from '@purposemint/contracts';
import { EntityManager, Repository } from 'typeorm';
import { AuditEvent } from '../entities/audit-event.entity';
import { UserGoal } from '../entities/user-goal.entity';

describe('transactional goal history', () => {
  const goal = Object.assign(new UserGoal(), {
    id: 'goal-id',
    userId: 'customer-id',
    title: 'Emergency cushion',
    targetAmount: 500,
    savedAmount: 50,
    isActive: true,
    isFocus: true,
  });
  function setup() {
    const manager = {
      create: jest.fn((_entity, value) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const audit = new AuditService({} as Repository<AuditEvent>);
    return { audit, manager, tx: manager as unknown as EntityManager };
  }
  it('records before and after values using the mutation transaction', async () => {
    const { audit, manager, tx } = setup();
    const before = { ...goalHistoryState(goal), savedAmount: 0 };
    await audit.recordGoalChange(tx, 'customer-id', goal, before);
    expect(manager.save).toHaveBeenCalledWith(
      AuditEvent,
      expect.objectContaining({
        action: AuditAction.GOAL_CHANGED,
        actorUserId: 'customer-id',
        entityId: 'goal-id',
        metadata: {
          userId: 'customer-id',
          previous: before,
          current: goalHistoryState(goal),
          source: 'customer',
        },
      }),
    );
  });
  it('records creation separately and skips no-op changes', async () => {
    const { audit, manager, tx } = setup();
    await audit.recordGoalChange(
      tx,
      'customer-id',
      goal,
      goalHistoryState(goal),
    );
    expect(manager.save).not.toHaveBeenCalled();
    await audit.recordGoalChange(tx, 'customer-id', goal, null);
    expect(manager.save).toHaveBeenCalledTimes(1);
  });
  it('propagates failure so the caller transaction can roll back', async () => {
    const { audit, manager, tx } = setup();
    manager.save.mockRejectedValue(new Error('audit write failed'));
    await expect(
      audit.recordGoalChange(tx, 'customer-id', goal, null),
    ).rejects.toThrow('audit write failed');
  });
});
