import { AssistantChatController } from './assistant-chat.controller';
import {
  AdminRole,
  UserStatus,
  UserType,
  AuditAction,
} from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';
import type { AssistantChatService } from './assistant-chat.service';
import type { AuditService } from '../audit/audit.service';
import type { DataSource } from 'typeorm';
import type { AssistantControlService } from './assistant-control.service';
describe('assistant prompt auditing', () => {
  const principal = {
    userId: 'admin',
    userType: UserType.ADMIN,
    adminRole: AdminRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    customRoleId: null,
  } as AuthPrincipal;
  const control = {
    assertAvailable: jest.fn(),
  } as unknown as AssistantControlService;
  const input = { messages: [{ role: 'user', content: 'Show savings' }] };
  it('persists the submitted prompt before invoking AI', async () => {
    const events: string[] = [];
    const manager = { query: jest.fn() };
    const audit = {
      recordTransactional: jest.fn().mockImplementation(() => {
        events.push('audit');
        return Promise.resolve();
      }),
    };
    const chat = {
      reply: jest.fn().mockImplementation(() => {
        events.push('chat');
        return Promise.resolve({ text: 'ok' });
      }),
    };
    const db = {
      query: jest.fn(),
      transaction: (work: (manager: object) => unknown) => work(manager),
    };
    const controller = new AssistantChatController(
      chat as unknown as AssistantChatService,
      db as unknown as DataSource,
      audit as unknown as AuditService,
      control,
    );
    await controller.reply(principal, input);
    expect(events).toEqual(['audit', 'chat']);
    expect(audit.recordTransactional).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        action: AuditAction.ADMIN_ASSISTANT_PROMPT,
        actorUserId: principal.userId,
        entityId: expect.any(String),
      }),
    );
  });
  it('does not invoke AI if audit persistence fails', async () => {
    const chat = { reply: jest.fn() };
    const db = {
      transaction: jest
        .fn()
        .mockRejectedValue(new Error('database unavailable')),
    };
    const controller = new AssistantChatController(
      chat as unknown as AssistantChatService,
      db as unknown as DataSource,
      {} as AuditService,
      control,
    );
    await expect(controller.reply(principal, input)).rejects.toThrow(
      'database unavailable',
    );
    expect(chat.reply).not.toHaveBeenCalled();
  });
});
