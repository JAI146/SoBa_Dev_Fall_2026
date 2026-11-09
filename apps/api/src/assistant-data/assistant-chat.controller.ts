import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
} from '@nestjs/common';
import {
  AuditAction,
  UserType,
  assistantChatInputSchema,
} from '@purposemint/contracts';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssistantChatService } from './assistant-chat.service';
import {
  AssistantControlService,
  requireAssistantAdmin,
} from './assistant-control.service';

@Controller('admin/assistant')
@Roles(UserType.ADMIN)
export class AssistantChatController {
  constructor(
    private readonly chat: AssistantChatService,
    private readonly db: DataSource,
    private readonly audit: AuditService,
    private readonly control: AssistantControlService,
  ) {}

  @Post('chat')
  async reply(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: unknown,
    @Headers('authorization') authorization = '',
  ) {
    requireAssistantAdmin(principal);
    const parsed = assistantChatInputSchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException('Invalid assistant messages.');
    await this.control.assertAvailable(principal.userId);

    const id = randomUUID();
    const prompt = parsed.data.messages.at(-1)!.content;
    await this.db.transaction(async (manager) => {
      await manager.query(
        'INSERT INTO assistant_turns (id, user_id, conversation_id, prompt) VALUES ($1, $2, $3, $4)',
        [id, principal.userId, parsed.data.conversationId ?? id, prompt],
      );
      await this.audit.recordTransactional(manager, {
        action: AuditAction.ADMIN_ASSISTANT_PROMPT,
        actorUserId: principal.userId,
        entityType: 'assistant_conversation',
        entityId: id,
      });
    });
    const result = await this.chat.reply(
      principal,
      parsed.data,
      authorization,
      {
        reserve: (model, body) =>
          this.control.reserve(principal.userId, model, body),
        authorize: () => this.control.assertAvailable(principal.userId),
      },
    );
    await this.db.query(
      'UPDATE assistant_turns SET answer = $2, charts = $3::jsonb WHERE id = $1',
      [id, result.text, JSON.stringify(result.charts)],
    );
    return result;
  }
}
