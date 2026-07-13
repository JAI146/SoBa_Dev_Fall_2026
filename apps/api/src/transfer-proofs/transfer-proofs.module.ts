import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Sponsorship } from "../entities/sponsorship.entity";
import { Family } from "../entities/family.entity";
import { TransferProof } from "../entities/transfer-proof.entity";
import { StorageModule } from "../storage/storage.module";
import {
  AdminTransferProofsController,
  DonorAllTransferProofsController,
  DonorTransferProofsController,
  FamilyTransferProofsController,
} from "./transfer-proofs.controller";
import { TransferProofsService } from "./transfer-proofs.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferProof, Sponsorship, Family]),
    StorageModule,
  ],
  controllers: [
    DonorTransferProofsController,
    DonorAllTransferProofsController,
    FamilyTransferProofsController,
    AdminTransferProofsController,
  ],
  providers: [TransferProofsService],
  exports: [TransferProofsService],
})
export class TransferProofsModule {}
