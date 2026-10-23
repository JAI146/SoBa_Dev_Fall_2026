import 'reflect-metadata';
import {
  AdminPermission,
  UserType,
  coachingOperationsQuerySchema,
  coachingOperationSchema,
  hasAdminPermission,
  AdminRole,
} from '@purposemint/contracts';
import { CoachingOperationsController } from './coaching-operations.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { publicCoachingOperation } from './coaching-operations.service';
import { CoachingOperation } from '../entities/coaching-operation.entity';
const row = {
  id: '00000000-0000-4000-8000-000000000001',
  eventType: 'goal_checkin',
  generationStatus: 'blocked',
  deliveryStatus: 'blocked',
  errorCode: null,
  safetyFlags: [],
  source: 'development_sample',
  createdAt: new Date('2026-10-12T00:00:00Z'),
  updatedAt: new Date('2026-10-12T00:00:00Z'),
} as CoachingOperation;
describe('14.4 coaching operational privacy', () => {
  it('requires staff type and a dedicated permission', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, CoachingOperationsController),
    ).toEqual([UserType.ADMIN]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, CoachingOperationsController),
    ).toEqual([AdminPermission.COACHING_OPERATIONS_VIEW]);
    expect(
      hasAdminPermission(
        AdminRole.MANAGER,
        AdminPermission.COACHING_OPERATIONS_VIEW,
      ),
    ).toBe(true);
    expect(
      hasAdminPermission(
        AdminRole.AUDITOR,
        AdminPermission.COACHING_OPERATIONS_VIEW,
      ),
    ).toBe(false);
  });
  it('rejects private prompt, response and conversation fields', () => {
    const metadata = publicCoachingOperation(row);
    for (const extra of [
      { prompt: 'private' },
      { response: 'private' },
      { conversation: 'private' },
      { userId: row.id },
    ])
      expect(
        coachingOperationSchema.safeParse({ ...metadata, ...extra }).success,
      ).toBe(false);
  });
  it('does not serialize unexpected private entity fields', () => {
    const result = publicCoachingOperation(
      Object.assign(new CoachingOperation(), row, {
        prompt: 'private prompt',
        response: 'private reply',
        conversationId: 'private-id',
      }),
    );
    expect(JSON.stringify(result)).not.toContain('private');
    expect(Object.keys(result)).toHaveLength(9);
  });
  it('normalizes provider text to safe event/error codes', () => {
    const result = publicCoachingOperation({
      ...row,
      eventType: 'private_prompt_text',
      errorCode: 'secret provider payload',
      safetyFlags: ['review_required', 'private text'],
    } as unknown as CoachingOperation);
    expect(result.eventType).toBe('unknown_event');
    expect(result.errorCode).toBe('unknown_error');
    expect(result.safetyFlags).toEqual(['review_required']);
  });
  it('maps unrecognized status text to blocked without exposing it', () => {
    const result = publicCoachingOperation({
      ...row,
      generationStatus: 'private provider payload',
      deliveryStatus: 'private reply',
    } as unknown as CoachingOperation);
    expect(result.generationStatus).toBe('blocked');
    expect(result.deliveryStatus).toBe('blocked');
    expect(JSON.stringify(result)).not.toContain('private');
  });
  it('accepts supported filters and positive page numbers only', () => {
    expect(coachingOperationsQuerySchema.parse({}).page).toBe(1);
    for (const invalid of [
      { page: 0 },
      { safetyFlag: 'private' },
      { prompt: 'private' },
      { source: 'confirmed_live' },
    ])
      expect(coachingOperationsQuerySchema.safeParse(invalid).success).toBe(
        false,
      );
  });
});
