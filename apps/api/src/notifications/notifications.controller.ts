import { NotificationEmailService } from './notification-email.service';
import { ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReEngagementPlanner } from './re-engagement-planner.service';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  UserType,
  AdminPermission,
  notificationSettingsUpdateSchema,
  categoryConfigurationSchema,
  notificationOperationsQuerySchema,
  queueNotificationSchema,
  notificationEmailInputSchema,
  notificationSmtpInputSchema,
  notificationEmailTestSchema,
} from '@purposemint/contracts';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth-principal';
import { zodDto } from '../common/pipes/zod-validation.pipe';
import { NotificationsService } from './notifications.service';
class SettingsDto extends zodDto(notificationSettingsUpdateSchema) {}
@Controller('notifications')
@Roles(UserType.CUSTOMER)
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationsService) {}
  @Get('preferences') get(@CurrentUser() user: AuthPrincipal) {
    return this.service.settings(user.userId);
  }
  @Patch('preferences') update(
    @CurrentUser() user: AuthPrincipal,
    @Body() input: SettingsDto,
  ) {
    return this.service.updateSettings(user.userId, input);
  }
}

class CategoryDto extends zodDto(categoryConfigurationSchema) {}
class OperationsQueryDto extends zodDto(notificationOperationsQuerySchema) {}
class EmailDto extends zodDto(notificationEmailInputSchema) {}
class SmtpDto extends zodDto(notificationSmtpInputSchema) {}
class TestEmailDto extends zodDto(notificationEmailTestSchema) {}
class QueueDto extends zodDto(queueNotificationSchema) {}
@Controller('admin/notifications')
@Roles(UserType.ADMIN)
export class NotificationOperationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly planner: ReEngagementPlanner,
    private readonly email: NotificationEmailService,
  ) {}
  @Get('smtp')
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  @ApiOperation({ summary: 'Read masked SMTP settings' })
  smtp() {
    return this.email.smtp();
  }
  @Post('smtp')
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  @ApiOperation({ summary: 'Configure notification email sender' })
  configureSmtp(@CurrentUser() user: AuthPrincipal, @Body() input: SmtpDto) {
    return this.email.configure(user, input);
  }
  @Post('email-test')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @RequirePermission(AdminPermission.SETTINGS_FULL)
  @ApiOperation({ summary: 'Send an explicit SMTP connection test' })
  testEmail(@CurrentUser() user: AuthPrincipal, @Body() input: TestEmailDto) {
    return this.email.test(user, input.email);
  }
  @Post(':id/send-email')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RequirePermission(AdminPermission.NOTIFICATIONS_EDIT)
  @ApiOperation({ summary: 'Send an eligible notification through SMTP' })
  sendEmail(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: EmailDto,
  ) {
    return this.email.send(user, id, input);
  }
  @Post('re-engagement/scan')
  @RequirePermission(AdminPermission.NOTIFICATIONS_EDIT)
  scan(@CurrentUser() user: AuthPrincipal) {
    return this.planner.planBatch(new Date(), user.userId);
  }
  @Get()
  @RequirePermission(AdminPermission.NOTIFICATIONS_VIEW)
  overview(
    @CurrentUser() user: AuthPrincipal,
    @Query() query: OperationsQueryDto,
  ) {
    return this.service.operations(user, query);
  }
  @Get('users/:id/preferences')
  @RequirePermission(AdminPermission.NOTIFICATIONS_VIEW)
  preferences(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.settings(id);
  }
  @Post('categories')
  @RequirePermission(AdminPermission.NOTIFICATIONS_EDIT)
  configure(@CurrentUser() user: AuthPrincipal, @Body() input: CategoryDto) {
    return this.service.configure(user, input);
  }
  @Post('queue')
  @RequirePermission(AdminPermission.NOTIFICATIONS_EDIT)
  queue(@CurrentUser() user: AuthPrincipal, @Body() input: QueueDto) {
    return this.service.queue(user, input);
  }
  @Post(':id/retry')
  @RequirePermission(AdminPermission.NOTIFICATIONS_EDIT)
  retry(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.retry(user, id);
  }
}
