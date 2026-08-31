import { Body, Controller, Patch, UseGuards } from '@nestjs/common'; import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../auth/auth-principal'; import { CurrentUser } from '../auth/decorators/current-user.decorator'; import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard'; import { DashboardService } from './dashboard.service'; import { UpdateValuesDto } from './dto/dashboard.dto';
@ApiTags('values') @ApiBearerAuth() @UseGuards(VerifiedEmailGuard) @Controller('values')
export class ValuesController { constructor(private readonly service:DashboardService){} @Patch() update(@CurrentUser() p:AuthPrincipal,@Body() body:UpdateValuesDto){return this.service.updateValues(p.userId,body)} }
