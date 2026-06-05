import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'employee@wps.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Employee@123' })
  @IsString()
  @MinLength(6)
  password: string;
}
