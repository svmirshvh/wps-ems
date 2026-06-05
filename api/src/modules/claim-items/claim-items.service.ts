import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ClaimStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClaimsService } from '../claims/claims.service';
import { AuditService } from '../audit/audit.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { CreateClaimItemDto } from './dto/create-claim-item.dto';
import { UpdateClaimItemDto } from './dto/update-claim-item.dto';

// EUR rate fixed per Excel (4.31 AED = 1 EUR)
const AED_TO_EUR = 4.31;

@Injectable()
export class ClaimItemsService {
  constructor(
    private prisma: PrismaService,
    private claimsService: ClaimsService,
    private auditService: AuditService,
    private exchangeRatesService: ExchangeRatesService,
  ) {}

  async create(claimId: string, userId: string, userRole: Role, dto: CreateClaimItemDto) {
    const claim = await this.claimsService.findOne(claimId, userId, userRole);

    if (claim.status !== ClaimStatus.DRAFT) {
      throw new BadRequestException('Cannot add items to a non-draft claim');
    }

    const { aedAmount, eurAmount, exchangeRateUsed } = await this.calculateAmounts(
      dto.currency,
      Number(dto.originalAmount),
    );

    const maxOrder = await this.prisma.claimItem.aggregate({
      where: { claimId },
      _max: { lineOrder: true },
    });
    const lineOrder = (maxOrder._max.lineOrder ?? 0) + 1;

    const item = await this.prisma.claimItem.create({
      data: {
        claimId,
        lineOrder,
        expenseDate: new Date(dto.expenseDate),
        categoryCode: dto.categoryCode,
        categoryName: dto.categoryName,
        plCostTypeNr: dto.plCostTypeNr,
        plCostTypeName: dto.plCostTypeName,
        pillarName: dto.pillarName,
        description: dto.description,
        country: dto.country,
        currency: dto.currency,
        originalAmount: dto.originalAmount,
        exchangeRateUsed,
        aedAmount,
        eurAmount,
        receiptNumber: dto.receiptNumber,
      },
    });

    await this.claimsService.recalculateTotals(claimId);

    await this.auditService.log({
      userId,
      claimId,
      action: 'CLAIM_ITEM_ADDED',
      entityType: 'ClaimItem',
      entityId: item.id,
    });

    return item;
  }

  async update(claimId: string, itemId: string, userId: string, userRole: Role, dto: UpdateClaimItemDto) {
    const claim = await this.claimsService.findOne(claimId, userId, userRole);

    if (claim.status !== ClaimStatus.DRAFT) {
      throw new BadRequestException('Cannot edit items on a non-draft claim');
    }

    const item = await this.prisma.claimItem.findFirst({ where: { id: itemId, claimId } });
    if (!item) throw new NotFoundException('Claim item not found');

    let aedAmount = Number(item.aedAmount);
    let eurAmount = Number(item.eurAmount);
    let exchangeRateUsed = Number(item.exchangeRateUsed);

    if (dto.currency || dto.originalAmount) {
      const currency = dto.currency ?? item.currency;
      const amount = dto.originalAmount ? Number(dto.originalAmount) : Number(item.originalAmount);
      const calculated = await this.calculateAmounts(currency, amount);
      aedAmount = calculated.aedAmount;
      eurAmount = calculated.eurAmount;
      exchangeRateUsed = Number(calculated.exchangeRateUsed);
    }

    const updated = await this.prisma.claimItem.update({
      where: { id: itemId },
      data: {
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        categoryCode: dto.categoryCode,
        categoryName: dto.categoryName,
        plCostTypeNr: dto.plCostTypeNr,
        plCostTypeName: dto.plCostTypeName,
        pillarName: dto.pillarName,
        description: dto.description,
        country: dto.country,
        currency: dto.currency,
        originalAmount: dto.originalAmount,
        exchangeRateUsed,
        aedAmount,
        eurAmount,
        receiptNumber: dto.receiptNumber,
      },
    });

    await this.claimsService.recalculateTotals(claimId);
    return updated;
  }

  async remove(claimId: string, itemId: string, userId: string, userRole: Role) {
    const claim = await this.claimsService.findOne(claimId, userId, userRole);

    if (claim.status !== ClaimStatus.DRAFT) {
      throw new BadRequestException('Cannot remove items from a non-draft claim');
    }

    const item = await this.prisma.claimItem.findFirst({ where: { id: itemId, claimId } });
    if (!item) throw new NotFoundException('Claim item not found');

    await this.prisma.claimItem.delete({ where: { id: itemId } });
    await this.claimsService.recalculateTotals(claimId);

    return { message: 'Item removed' };
  }

  private async calculateAmounts(currency: string, originalAmount: number) {
    let aedAmount: number;
    let exchangeRateUsed: number;

    if (currency === 'AED') {
      aedAmount = originalAmount;
      exchangeRateUsed = 1;
    } else {
      const rate = await this.exchangeRatesService.getLatestRate(currency, 'AED');
      exchangeRateUsed = rate;
      aedAmount = originalAmount * rate;
    }

    const eurAmount = aedAmount / AED_TO_EUR;

    return {
      aedAmount: Math.round(aedAmount * 100) / 100,
      eurAmount: Math.round(eurAmount * 100) / 100,
      exchangeRateUsed,
    };
  }
}
