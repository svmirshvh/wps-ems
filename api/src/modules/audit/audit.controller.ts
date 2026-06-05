import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN, Role.FINANCE, Role.BILL_HEAD)
  @ApiOperation({ summary: 'Get audit logs' })
  findAll(
    @Query('userId') userId?: string,
    @Query('claimId') claimId?: string,
    @Query('action') action?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findAll({ userId, claimId, action, page, limit });
  }
}
