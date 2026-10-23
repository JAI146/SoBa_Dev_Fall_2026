import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuditEvent } from '../entities/audit-event.entity';
import { SupportCaseCategory } from '../entities/support-case-category.entity';
import { SupportCase } from '../entities/support-case.entity';
import { User } from '../entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { SupportCasesController } from './support-cases.controller';
import { SupportCasesService } from './support-cases.service';

@Module({
  imports: [
    AuditModule,
    MailModule,
    TypeOrmModule.forFeature([
      SupportCase,
      SupportCaseCategory,
      User,
      AuditEvent,
    ]),
  ],
  controllers: [SupportCasesController],
  providers: [SupportCasesService],
})
export class SupportCasesModule {}
