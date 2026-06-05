import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClaimDto {
  @ApiProperty({ required: false }) @IsString() @IsOptional() eventName?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() purpose?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() department?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() notes?: string;
}
