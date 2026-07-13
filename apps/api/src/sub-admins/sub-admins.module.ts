import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { AdminSubAdminsController } from "./admin-sub-admins.controller";
import { SubAdminsService } from "./sub-admins.service";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AdminSubAdminsController],
  providers: [SubAdminsService],
  exports: [SubAdminsService],
})
export class SubAdminsModule {}
