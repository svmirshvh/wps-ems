import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExchangeRatesService } from './exchange-rates.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Exchange Rates')
@ApiBearerAuth()
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private exchangeRatesService: ExchangeRatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all exchange rates' })
  findAll() { return this.exchangeRatesService.findAll(); }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest rates for all currencies' })
  getLatest() { return this.exchangeRatesService.getLatestRates(); }

  @Get('currencies')
  @ApiOperation({ summary: 'Get supported currencies' })
  getCurrencies() { return this.exchangeRatesService.getSupportedCurrencies(); }

  @Post()
  @Roles(Role.ADMIN, Role.FINANCE, Role.BILL_HEAD)
  @ApiOperation({ summary: 'Add exchange rate' })
  create(@Body() dto: CreateExchangeRateDto) { return this.exchangeRatesService.create(dto); }
}
