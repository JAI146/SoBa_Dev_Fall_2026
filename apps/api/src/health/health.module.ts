import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
