import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { StorageModule } from "../storage/storage.module";
import { AdminDonorsController } from "./admin-donors.controller";
import { DonorAccountController } from "./donor-account.controller";
import { DonorAccountService } from "./donor-account.service";
import { DonorsService } from "./donors.service";

@Module({
  imports: [TypeOrmModule.forFeature([User]), StorageModule],
  controllers: [AdminDonorsController, DonorAccountController],
  providers: [DonorsService, DonorAccountService],
})
export class DonorsModule {}
