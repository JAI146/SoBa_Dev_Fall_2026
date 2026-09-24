/**
 * Exposes super-admin program, review, event, and reporting endpoints.
 * Shared schemas validate input; services handle mutations and audit records,
 * while reporting queries supply lists, details, and analytics.
 */
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AdminRole,
  incentiveEventInputSchema,
  incentiveProgramInputSchema,
  incentiveProgramCreateSchema,
  incentiveQuerySchema,
  incentiveReviewSchema,
} from '@purposemint/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthPrincipal } from '../auth/auth-principal';
import { zodDto } from '../common/pipes/zod-validation.pipe';
import { IncentivesService } from './incentives.service';
import { IncentivesQueries } from './incentives.queries';

class ProgramDto extends zodDto(incentiveProgramInputSchema) {}
class CreateProgramDto extends zodDto(incentiveProgramCreateSchema) {}
class ReviewDto extends zodDto(incentiveReviewSchema) {}
class EventDto extends zodDto(incentiveEventInputSchema) {}
class QueryDto extends zodDto(incentiveQuerySchema) {}

// Fail closed until the shared configurable permission system is available.
// Keep the policy here so the access-control owner can replace it without touching the ledger.
@ApiTags('admin-incentives')
@ApiBearerAuth()
@Roles(AdminRole.SUPER_ADMIN)
@Controller('admin/incentives')
export class IncentivesController {
  constructor(
    private readonly service: IncentivesService,
    private readonly queries: IncentivesQueries,
  ) {}
  @Get('programs')
  async programs(@CurrentUser() principal: AuthPrincipal) {
    await this.service.recordRead(principal.userId, 'programs');
    return this.service.programs();
  }
  @Patch('programs/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ProgramDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.updateProgram(id, body, principal.userId);
  }
  @Post('programs')
  create(
    @Body() body: CreateProgramDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.createProgram(body, principal.userId);
  }
  @Get('benefits')
  async list(
    @Query() query: QueryDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    await this.service.recordRead(principal.userId, 'benefits');
    return this.queries.list(query);
  }
  @Post('benefits/review')
  review(@Body() body: ReviewDto, @CurrentUser() principal: AuthPrincipal) {
    return this.service.review(body, principal.userId);
  }
  @Get('benefits/:id')
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    await this.service.recordRead(principal.userId, id);
    return this.queries.detail(id);
  }
  @Post('benefits/:id/events')
  record(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: EventDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.recordEvent(id, body, principal.userId);
  }
  @Get('analytics')
  async analytics(
    @Query() query: QueryDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    await this.service.recordRead(principal.userId, 'analytics');
    return this.queries.analytics(query);
  }
}
