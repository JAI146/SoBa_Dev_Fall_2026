import { SupportCaseStatus as S } from '@purposemint/contracts';
import {
  canChangeStatus,
  canClose,
  canEscalate,
  canResolve,
  statusAfterAssignment,
} from './support-case-transitions';

describe('support case transitions', () => {
  it('lets open cases move between in progress and waiting for user', () => {
    expect(canChangeStatus(S.NEW, S.IN_PROGRESS)).toBe(true);
    expect(canChangeStatus(S.IN_PROGRESS, S.WAITING_FOR_USER)).toBe(true);
    expect(canChangeStatus(S.WAITING_FOR_USER, S.IN_PROGRESS)).toBe(true);
  });

  it('only reopens a resolved case into in progress', () => {
    expect(canChangeStatus(S.RESOLVED, S.IN_PROGRESS)).toBe(true);
    expect(canChangeStatus(S.RESOLVED, S.WAITING_FOR_USER)).toBe(false);
  });

  it('treats closed as final', () => {
    for (const target of Object.values(S)) {
      expect(canChangeStatus(S.CLOSED, target)).toBe(false);
    }
    expect(canEscalate(S.CLOSED)).toBe(false);
    expect(canResolve(S.CLOSED)).toBe(false);
    expect(canClose(S.CLOSED)).toBe(false);
  });

  it('escalates once, from an open case', () => {
    expect(canEscalate(S.IN_PROGRESS)).toBe(true);
    expect(canEscalate(S.ESCALATED)).toBe(false);
    expect(canEscalate(S.RESOLVED)).toBe(false);
  });

  it('resolves open cases including escalated ones, and closes only resolved', () => {
    expect(canResolve(S.ESCALATED)).toBe(true);
    expect(canResolve(S.RESOLVED)).toBe(false);
    expect(canClose(S.RESOLVED)).toBe(true);
    expect(canClose(S.IN_PROGRESS)).toBe(false);
  });

  it('moves new to assigned and back only for untouched cases', () => {
    expect(statusAfterAssignment(S.NEW, 'u1')).toBe(S.ASSIGNED);
    expect(statusAfterAssignment(S.ASSIGNED, null)).toBe(S.NEW);
    expect(statusAfterAssignment(S.IN_PROGRESS, 'u1')).toBe(S.IN_PROGRESS);
    expect(statusAfterAssignment(S.ESCALATED, null)).toBe(S.ESCALATED);
  });
});
