import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClaimStatus } from '@prisma/client';
import { FinanceService } from './finance.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Finance')
@ApiBearerAuth()
@Roles(Role.FINANCE, Role.BILL_HEAD, Role.ADMIN)
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Finance dashboard KPIs and data' })
  getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('department') department?: string,
    @Query('status') status?: ClaimStatus,
  ) {
    return this.financeService.getDashboard({ startDate, endDate, userId, department, status });
  }

  @Get('export')
  @ApiOperation({ summary: 'Get claims data for CSV/Excel export' })
  getExport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: ClaimStatus,
  ) {
    return this.financeService.getClaimsForExport({ startDate, endDate, status });
  }
}
