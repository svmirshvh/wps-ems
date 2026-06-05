import { IsString, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateClaimItemDto {
  @ApiProperty() @IsDateString() expenseDate: string;
  @ApiProperty() @IsString() categoryCode: string;
  @ApiProperty() @IsString() categoryName: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() plCostTypeNr?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() plCostTypeName?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() pillarName?: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() country?: string;
  @ApiProperty({ enum: ['AED', 'USD', 'EUR', 'TRY', 'CNY'], default: 'AED' })
  @IsIn(['AED', 'USD', 'EUR', 'TRY', 'CNY']) currency: string;
  @ApiProperty() @Type(() => Number) @IsNumber() originalAmount: number;
  @ApiProperty({ required: false }) @IsString() @IsOptional() receiptNumber?: string;
}
