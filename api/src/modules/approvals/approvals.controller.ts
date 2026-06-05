import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { ApproveClaimDto } from './dto/approve-claim.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(private approvalsService: ApprovalsService) {}

  @Get('pending')
  @Roles(Role.MANAGER, Role.FINANCE, Role.BILL_HEAD, Role.ADMIN)
  @ApiOperation({ summary: 'Get claims pending approval' })
  getPending(@CurrentUser() user: any) {
    return this.approvalsService.getPendingClaims(user.role, user.id);
  }

  @Post(':claimId')
  @Roles(Role.MANAGER, Role.FINANCE, Role.BILL_HEAD, Role.ADMIN)
  @ApiOperation({ summary: 'Approve or reject a claim' })
  approve(
    @Param('claimId') claimId: string,
    @CurrentUser() user: any,
    @Body() dto: ApproveClaimDto,
  ) {
    return this.approvalsService.approve(claimId, user.id, user.role, dto);
  }

  @Post(':claimId/reopen')
  @Roles(Role.FINANCE, Role.BILL_HEAD, Role.ADMIN)
  @ApiOperation({ summary: 'Reopen a rejected claim' })
  reopen(@Param('claimId') claimId: string, @CurrentUser() user: any) {
    return this.approvalsService.reopen(claimId, user.id, user.role);
  }
}
