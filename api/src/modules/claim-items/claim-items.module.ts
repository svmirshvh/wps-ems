import { Module } from '@nestjs/common';
import { ClaimItemsController } from './claim-items.controller';
import { ClaimItemsService } from './claim-items.service';
import { ClaimsModule } from '../claims/claims.module';
import { AuditModule } from '../audit/audit.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [ClaimsModule, AuditModule, ExchangeRatesModule],
  controllers: [ClaimItemsController],
  providers: [ClaimItemsService],
})
export class ClaimItemsModule {}
