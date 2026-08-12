import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  DeletionRequestResponse,
  ProfileImageUploadResponse,
  UserPublic,
} from '@purposemint/contracts';
import type { Request } from 'express';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { requestContext } from '../common/request-context';
import {
  ProfileImageUploadDto,
  RecordPolicyAgreementDto,
  UpdateNotificationPreferencesDto,
  UpdateProfileDto,
} from './dto/users.dto';
import { UsersService } from './users.service';

/**
 * Every route here is authenticated — the globally registered `JwtAuthGuard`
 * covers anything without `@Public()`.
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'The signed-in account' })
  me(@CurrentUser() principal: AuthPrincipal): Promise<UserPublic> {
    return this.usersService.getProfile(principal.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update name and location' })
  updateProfile(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: UpdateProfileDto,
  ): Promise<UserPublic> {
    return this.usersService.updateProfile(principal.userId, body);
  }

  @Patch('me/notification-preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  updateNotificationPreferences(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: UpdateNotificationPreferencesDto,
  ): Promise<UserPublic> {
    return this.usersService.updateNotificationPreferences(
      principal.userId,
      body,
    );
  }

  @Post('me/policy-agreements')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record agreement to a policy document version' })
  recordPolicyAgreement(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: RecordPolicyAgreementDto,
  ): Promise<UserPublic> {
    return this.usersService.recordPolicyAgreement(principal.userId, body);
  }

  @Post('me/profile-image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a short-lived S3 URL for uploading a profile picture',
  })
  createProfileImageUploadUrl(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: ProfileImageUploadDto,
  ): Promise<ProfileImageUploadResponse> {
    return this.usersService.createProfileImageUploadUrl(
      principal.userId,
      body.contentType,
    );
  }

  @Post('me/deletion-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask for the account to be deleted' })
  requestDeletion(
    @CurrentUser() principal: AuthPrincipal,
    @Req() request: Request,
  ): Promise<DeletionRequestResponse> {
    return this.usersService.requestDeletion(
      principal.userId,
      requestContext(request),
    );
  }

  @Delete('me/deletion-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change your mind about deleting the account' })
  cancelDeletion(
    @CurrentUser() principal: AuthPrincipal,
    @Req() request: Request,
  ): Promise<DeletionRequestResponse> {
    return this.usersService.cancelDeletion(
      principal.userId,
      requestContext(request),
    );
  }
}
