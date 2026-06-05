import { IsString, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateExchangeRateDto {
  @ApiProperty({ example: 'USD' }) @IsString() baseCurrency: string;
  @ApiProperty({ example: 'AED' }) @IsString() targetCurrency: string;
  @ApiProperty({ example: 3.6725 }) @Type(() => Number) @IsNumber() rate: number;
  @ApiProperty({ example: '2026-06-04' }) @IsDateString() effectiveDate: string;
}
