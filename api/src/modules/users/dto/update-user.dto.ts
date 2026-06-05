import { IsString, MinLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @ApiProperty({ required: false }) @IsString() @IsOptional() firstName?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() lastName?: string;
  @ApiProperty({ required: false }) @IsString() @MinLength(8) @IsOptional() password?: string;
  @ApiProperty({ enum: Role, required: false }) @IsEnum(Role) @IsOptional() role?: Role;
  @ApiProperty({ required: false }) @IsString() @IsOptional() accountNo?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() iban?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() swift?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() bankName?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() department?: string;
  @ApiProperty({ required: false }) @IsBoolean() @IsOptional() isActive?: boolean;
}
