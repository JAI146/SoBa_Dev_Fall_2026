import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { CommunityChallengesService } from './community-challenges.service';

@ApiTags('community-challenges')
@ApiBearerAuth()
@UseGuards(VerifiedEmailGuard)
@Controller('community-challenges')
export class CommunityChallengesController {
  constructor(private readonly service: CommunityChallengesService) {}

  @Post(':id/join')
  join(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.join(principal.userId, id);
  }
}
