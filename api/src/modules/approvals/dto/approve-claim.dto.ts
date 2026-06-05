import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveClaimDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
