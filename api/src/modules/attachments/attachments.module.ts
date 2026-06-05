import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AuditModule } from '../audit/audit.module';
import { ClaimsModule } from '../claims/claims.module';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    AuditModule,
    ClaimsModule,
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
