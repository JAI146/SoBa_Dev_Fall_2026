import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** Public so a load balancer can reach it without credentials. */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and database connectivity' })
  check() {
    return this.healthService.check();
  }
}
