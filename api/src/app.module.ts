import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { ClaimItemsModule } from './modules/claim-items/claim-items.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClaimsModule,
    ClaimItemsModule,
    AttachmentsModule,
    ApprovalsModule,
    FinanceModule,
    AuditModule,
    NotificationsModule,
    PdfModule,
    ExchangeRatesModule,
  ],
})
export class AppModule {}
