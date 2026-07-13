import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivityLog } from "../entities/activity-log.entity";
import { User } from "../entities/user.entity";
import { AdminActivityLogsController } from "./admin-activity-logs.controller";
import { ActivityLogService } from "./activity-log.service";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog, User])],
  controllers: [AdminActivityLogsController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogsModule {}
