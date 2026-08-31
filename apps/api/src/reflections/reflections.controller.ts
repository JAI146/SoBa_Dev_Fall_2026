import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import {
  CreateMoodEntryDto,
  CreateReflectionDto,
  ReflectionListQueryDto,
  UpdateReflectionDto,
} from './dto/reflections.dto';
import { ReflectionsService } from './reflections.service';

@ApiTags('reflections')
@ApiBearerAuth()
@UseGuards(VerifiedEmailGuard)
@Controller('reflections')
export class ReflectionsController {
  constructor(private readonly service: ReflectionsService) {}
  @Get() list(
    @CurrentUser() principal: AuthPrincipal,
    @Query() query: ReflectionListQueryDto,
  ) {
    return this.service.list(principal.userId, query);
  }
  @Post() create(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: CreateReflectionDto,
  ) {
    return this.service.create(principal.userId, body);
  }
  @Post('mood') mood(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: CreateMoodEntryDto,
  ) {
    return this.service.createMood(principal.userId, body);
  }
  @Get('summary') summary(@CurrentUser() principal: AuthPrincipal) {
    return this.service.getSummary(principal.userId);
  }
  @Patch(':id') update(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateReflectionDto,
  ) {
    return this.service.update(principal.userId, id, body);
  }
  @Delete(':id') remove(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(principal.userId, id);
  }
}
