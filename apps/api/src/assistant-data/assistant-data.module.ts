import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AssistantDataController } from './assistant-data.controller';
import { AssistantDataService } from './assistant-data.service';
import { AssistantChatController } from './assistant-chat.controller';
import { AssistantChatService } from './assistant-chat.service';
import { AssistantToolsService } from './assistant-tools.service';

import { AssistantControlController } from './assistant-control.controller';
import { AssistantControlService } from './assistant-control.service';
import { AssistantRetentionService } from './assistant-retention.service';
@Module({
  imports: [AuditModule],
  controllers: [
    AssistantDataController,
    AssistantChatController,
    AssistantControlController,
  ],
  providers: [
    AssistantRetentionService,
    AssistantControlService,
    AssistantDataService,
    AssistantChatService,
    AssistantToolsService,
  ],
  exports: [AssistantDataService],
})
export class AssistantDataModule {}
