import { Module } from '@nestjs/common';
import { CoachingOperationsService } from './coaching-operations.service';
import { CoachingOperationsController } from './coaching-operations.controller';
@Module({
  controllers: [CoachingOperationsController],
  providers: [CoachingOperationsService],
})
export class CoachingOperationsModule {}
