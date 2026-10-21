jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditAction, OnboardingStatus } from '@purposemint/contracts';
import { DashboardService } from './dashboard.service';
import { AuditService } from '../audit/audit.service';
import { AuditEvent } from '../entities/audit-event.entity';
import { HabitCompletion } from '../entities/habit-completion.entity';
import { Repository } from 'typeorm';

describe('customer habit pause operations', () => {
  function setup() {
    const events: AuditEvent[] = [];
    const manager = {
      transaction: jest.fn(),
      findOne: jest.fn(async (type, query) =>
        type !== HabitCompletion && query.where.userId === 'owner'
          ? { id: 'habit', userId: 'owner', isActive: true }
          : null,
      ),
      find: jest.fn(async () => events),
      create: jest.fn((_type, data) => data),
      save: jest.fn(async (type, data) => {
        if (type === AuditEvent)
          events.push({ ...data, createdAt: new Date() });
        return data;
      }),
    };
    manager.transaction.mockImplementation(
      async (callback: (value: typeof manager) => Promise<unknown>) =>
        callback(manager),
    );
    const service = Object.create(
      DashboardService.prototype,
    ) as DashboardService;
    Object.assign(service, {
      userHabitsRepo: { manager },
      completionsRepo: { manager },
      usersService: {
        getByIdOrFail: jest.fn(async () => ({
          onboardingStatus: OnboardingStatus.COMPLETED,
          timeZone: 'America/Chicago',
        })),
      },
      audit: new AuditService({} as Repository<AuditEvent>),
    });
    return { service, manager, events };
  }
  it('records an explicit pause once and permits a later resume', async () => {
    const { service, events } = setup();
    expect(
      await service.setHabitPause('owner', 'habit', { paused: true }),
    ).toEqual({ userHabitId: 'habit', isPaused: true });
    await service.setHabitPause('owner', 'habit', { paused: true });
    expect(events).toHaveLength(1);
    expect(events[0].action).toBe(AuditAction.HABIT_PAUSED);
    await service.setHabitPause('owner', 'habit', { paused: false });
    expect(events.at(-1)?.action).toBe(AuditAction.HABIT_RESUMED);
  });
  it('checks ownership before writing an event', async () => {
    const { service, events } = setup();
    await expect(
      service.setHabitPause('another-user', 'habit', { paused: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(events).toHaveLength(0);
  });
  it('rejects completion while paused', async () => {
    const { service, manager } = setup();
    await service.setHabitPause('owner', 'habit', { paused: true });
    await expect(
      service.toggleHabitCompletion('owner', 'habit'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      manager.save.mock.calls.some(([type]) => type === HabitCompletion),
    ).toBe(false);
  });
  it('allows completion after resume', async () => {
    const { service } = setup();
    await service.setHabitPause('owner', 'habit', { paused: true });
    await service.setHabitPause('owner', 'habit', { paused: false });
    expect(await service.toggleHabitCompletion('owner', 'habit')).toEqual(
      expect.objectContaining({ userHabitId: 'habit', completedToday: true }),
    );
  });
  it('propagates an audit failure', async () => {
    const { service, manager } = setup();
    manager.save.mockRejectedValueOnce(new Error('failed to persist pause'));
    await expect(
      service.setHabitPause('owner', 'habit', { paused: true }),
    ).rejects.toThrow('failed to persist pause');
  });

  it('rejects pause changes before onboarding is complete', async () => {
    const { service, events } = setup();
    Object.assign(service, {
      usersService: {
        getByIdOrFail: jest.fn(async () => ({
          onboardingStatus: OnboardingStatus.IN_PROGRESS,
        })),
      },
    });
    await expect(
      service.setHabitPause('owner', 'habit', { paused: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(events).toHaveLength(0);
  });
});
