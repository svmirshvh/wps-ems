import { IsString, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateClaimItemDto {
  @ApiProperty({ required: false }) @IsDateString() @IsOptional() expenseDate?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() categoryCode?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() categoryName?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() plCostTypeNr?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() plCostTypeName?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() pillarName?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() description?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() country?: string;
  @ApiProperty({ enum: ['AED', 'USD', 'EUR', 'TRY', 'CNY'], required: false })
  @IsIn(['AED', 'USD', 'EUR', 'TRY', 'CNY']) @IsOptional() currency?: string;
  @ApiProperty({ required: false }) @Type(() => Number) @IsNumber() @IsOptional() originalAmount?: number;
  @ApiProperty({ required: false }) @IsString() @IsOptional() receiptNumber?: string;
}
