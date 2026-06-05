import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiProperty({ enum: Role, default: Role.EMPLOYEE }) @IsEnum(Role) @IsOptional() role?: Role;
  @ApiProperty({ required: false }) @IsString() @IsOptional() accountNo?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() iban?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() swift?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() bankName?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() department?: string;
}
