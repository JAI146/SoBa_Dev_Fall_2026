import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  UserType,
  adminPlanInputSchema,
  adminPlanUpdateSchema,
  adminPlansQuerySchema,
  adminSubscriptionsQuerySchema,
  subscriptionAssignSchema,
  subscriptionChangeSchema,
  subscriptionCancelSchema,
  subscriptionPaymentInputSchema,
  subscriptionVersionSchema,
} from '@purposemint/contracts';
import type { Request } from 'express';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { zodDto } from '../common/pipes/zod-validation.pipe';
import { SubscriptionManagementService } from './subscription-management.service';
import { SubscriptionAdminGuard } from './subscription-admin.guard';

class PlanDto extends zodDto(adminPlanInputSchema) {}
class UpdatePlanDto extends zodDto(adminPlanUpdateSchema) {}
class PlansQueryDto extends zodDto(adminPlansQuerySchema) {}
class SubscriptionsQueryDto extends zodDto(adminSubscriptionsQuerySchema) {}
class AssignDto extends zodDto(subscriptionAssignSchema) {}
class ChangeDto extends zodDto(subscriptionChangeSchema) {}
class CancelDto extends zodDto(subscriptionCancelSchema) {}
class PaymentDto extends zodDto(subscriptionPaymentInputSchema) {}
class VersionDto extends zodDto(subscriptionVersionSchema) {}

// The checkout currently supports only super_admin. Keep this fail-closed policy
// here so the future permission system can replace it without changing the domain.
@ApiTags('admin-subscriptions')
@ApiBearerAuth()
@Roles(UserType.ADMIN)
@UseGuards(SubscriptionAdminGuard)
@Controller('admin/subscription-management')
export class SubscriptionManagementController {
  constructor(private readonly service: SubscriptionManagementService) {}
  @Get('capabilities')
  @ApiOperation({ summary: 'List supported configurable capabilities' })
  capabilities() {
    return this.service.capabilities();
  }
  @Get('plans')
  @ApiOperation({ summary: 'List configurable plans' })
  plans(@Query() query: PlansQueryDto) {
    return this.service.listPlans(query);
  }
  @Post('plans')
  @ApiOperation({ summary: 'Create a subscription plan' })
  createPlan(
    @Body() input: PlanDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.service.savePlan(input, actor.userId, request.ip ?? null);
  }
  @Patch('plans/:key')
  @ApiOperation({ summary: 'Edit or retire a subscription plan' })
  updatePlan(
    @Param('key') key: string,
    @Body() input: UpdatePlanDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    if (key !== input.plan.key)
      throw new BadRequestException('Plan keys cannot be changed.');
    return this.service.savePlan(
      input.plan,
      actor.userId,
      request.ip ?? null,
      input.expectedVersion,
    );
  }
  @Get('subscriptions')
  @ApiOperation({ summary: 'List customer subscriptions' })
  subscriptions(@Query() query: SubscriptionsQueryDto) {
    return this.service.listSubscriptions(query);
  }
  @Get('subscriptions/:id')
  @ApiOperation({ summary: 'View subscription, billing, and history' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detail(id);
  }
  @Post('subscriptions')
  @ApiOperation({ summary: 'Assign a customer subscription' })
  assign(
    @Body() input: AssignDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.service.assign(input, actor.userId, request.ip ?? null);
  }
  @Post('subscriptions/:id/change')
  @ApiOperation({
    summary: 'Change plan or billing cycle immediately or at renewal',
  })
  change(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ChangeDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.service.change(id, input, actor.userId, request.ip ?? null);
  }
  @Post('subscriptions/:id/cancel')
  @ApiOperation({ summary: 'Cancel while retaining history' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CancelDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.service.cancel(id, input, actor.userId, request.ip ?? null);
  }
  @Post('subscriptions/:id/remove-scheduled-change')
  @ApiOperation({ summary: 'Remove a pending subscription change' })
  clear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: VersionDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.service.clearPending(
      id,
      input.expectedVersion,
      actor.userId,
      request.ip ?? null,
    );
  }
  @Post('subscriptions/:id/payments')
  @ApiOperation({
    summary:
      'Record a staff-confirmed payment outcome without collecting payment',
  })
  payment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: PaymentDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.service.payment(id, input, actor.userId, request.ip ?? null);
  }
}
