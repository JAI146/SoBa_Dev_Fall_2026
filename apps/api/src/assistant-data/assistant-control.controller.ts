import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  AdminRole,
  assistantBudgetSchema,
  assistantDecisionSchema,
  assistantRequestSchema,
  assistantTranscriptFiltersSchema,
  UserType,
} from '@purposemint/contracts';

import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AssistantControlService,
  requireAssistantAdmin,
  requireAssistantSupervisor,
} from './assistant-control.service';

function parse<T>(
  schema: {
    safeParse(input: unknown): { success: true; data: T } | { success: false };
  },
  input: unknown,
) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new BadRequestException(
      'Check the submitted settings or filters and try again.',
    );
  return result.data;
}

@Controller('admin/assistant-control')
@Roles(AdminRole.SUPER_ADMIN)
export class AssistantControlController {
  constructor(private readonly control: AssistantControlService) {}

  @Get('status')
  @Roles(UserType.ADMIN)
  status(@CurrentUser() principal: AuthPrincipal) {
    requireAssistantAdmin(principal);
    return this.control.status(principal.userId);
  }

  @Post('requests')
  @Roles(UserType.ADMIN)
  request(@CurrentUser() principal: AuthPrincipal, @Body() body: unknown) {
    requireAssistantAdmin(principal);
    return this.control.requestAccess(
      principal.userId,
      parse(assistantRequestSchema, body).note,
    );
  }

  @Get()
  overview(@CurrentUser() principal: AuthPrincipal) {
    requireAssistantSupervisor(principal);
    return this.control.overview();
  }

  @Get('pending')
  pending(@CurrentUser() principal: AuthPrincipal) {
    requireAssistantSupervisor(principal);
    return this.control.pendingCount();
  }

  @Post('access/:id')
  decision(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    requireAssistantSupervisor(principal);
    return this.control.decision(
      id,
      principal.userId,
      parse(assistantDecisionSchema, body).decision,
    );
  }

  @Put('budget')
  async budget(@CurrentUser() principal: AuthPrincipal, @Body() body: unknown) {
    requireAssistantSupervisor(principal);
    await this.control.saveBudget(
      parse(assistantBudgetSchema, body),
      principal.userId,
    );
    return this.control.overview();
  }

  @Get('activity/:id')
  transcript(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: unknown,
  ) {
    requireAssistantSupervisor(principal);
    const filters = parse(assistantTranscriptFiltersSchema, query);
    return this.control.transcript(id, {
      ...filters,
      prompts: filters.prompts === 'true',
      answers: filters.answers === 'true',
      searchPrompts: (filters.searchPrompts ?? filters.prompts) === 'true',
      searchAnswers: (filters.searchAnswers ?? filters.answers) === 'true',
    });
  }
}
