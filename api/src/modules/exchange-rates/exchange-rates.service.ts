import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';

const SUPPORTED_CURRENCIES = ['AED', 'USD', 'EUR', 'TRY', 'CNY'];

@Injectable()
export class ExchangeRatesService {
  constructor(private prisma: PrismaService) {}

  async getLatestRates() {
    // Single query to fetch the latest rate per currency (instead of N serial queries)
    const rows = await this.prisma.exchangeRate.findMany({
      where: { targetCurrency: 'AED', baseCurrency: { in: SUPPORTED_CURRENCIES } },
      orderBy: { effectiveDate: 'desc' },
      distinct: ['baseCurrency'],
    });

    const result: Record<string, number> = { AED: 1 };
    rows.forEach((r) => { result[r.baseCurrency] = Number(r.rate); });

    // Fill missing currencies with 0
    for (const currency of SUPPORTED_CURRENCIES) {
      if (!(currency in result)) result[currency] = 0;
    }

    return result;
  }

  async getLatestRate(fromCurrency: string, toCurrency: string = 'AED'): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    const rate = await this.prisma.exchangeRate.findFirst({
      where: { baseCurrency: fromCurrency, targetCurrency: toCurrency },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!rate) {
      throw new NotFoundException(`Exchange rate for ${fromCurrency} → ${toCurrency} not found`);
    }

    return Number(rate.rate);
  }

  async getRateHistory(currency: string, limit = 30) {
    return this.prisma.exchangeRate.findMany({
      where: { baseCurrency: currency, targetCurrency: 'AED' },
      orderBy: { effectiveDate: 'desc' },
      take: limit,
    });
  }

  async create(dto: CreateExchangeRateDto) {
    if (!SUPPORTED_CURRENCIES.includes(dto.baseCurrency) || !SUPPORTED_CURRENCIES.includes(dto.targetCurrency)) {
      throw new BadRequestException('Unsupported currency');
    }

    return this.prisma.exchangeRate.upsert({
      where: {
        baseCurrency_targetCurrency_effectiveDate: {
          baseCurrency: dto.baseCurrency,
          targetCurrency: dto.targetCurrency,
          effectiveDate: new Date(dto.effectiveDate),
        },
      },
      update: { rate: dto.rate },
      create: {
        baseCurrency: dto.baseCurrency,
        targetCurrency: dto.targetCurrency,
        rate: dto.rate,
        effectiveDate: new Date(dto.effectiveDate),
      },
    });
  }

  async findAll() {
    return this.prisma.exchangeRate.findMany({
      orderBy: [{ targetCurrency: 'asc' }, { effectiveDate: 'desc' }],
    });
  }

  getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES;
  }
}
