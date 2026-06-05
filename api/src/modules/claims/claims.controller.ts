import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ClaimStatus, Role } from '@prisma/client';
import { ClaimsService } from './claims.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Claims')
@ApiBearerAuth()
@Controller('claims')
export class ClaimsController {
  constructor(
    private claimsService: ClaimsService,
    private pdfService: PdfService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getDashboard(@CurrentUser() user: any) {
    return this.claimsService.getDashboardStats(user.id, user.role);
  }

  @Get('finance-members')
  @ApiOperation({ summary: 'Get list of finance members for claim assignment' })
  getFinanceMembers() {
    return this.claimsService.getFinanceMembers();
  }

  @Get()
  @ApiOperation({ summary: 'List claims' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: ClaimStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('scope') scope?: string,
  ) {
    return this.claimsService.findAll(user.id, user.role, { status, page, limit, search, scope });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new claim' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateClaimDto) {
    return this.claimsService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get claim by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.claimsService.findOne(id, user.id, user.role);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a draft claim' })
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateClaimDto) {
    return this.claimsService.update(id, user.id, user.role, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a claim for approval' })
  submit(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('assignedFinanceId') assignedFinanceId?: string,
  ) {
    return this.claimsService.submit(id, userId, assignedFinanceId);
  }

  @Post(':id/invite-finance')
  @Roles(Role.FINANCE, Role.BILL_HEAD, Role.ADMIN)
  @ApiOperation({ summary: 'Invite another finance member to collaborate on a claim' })
  inviteFinance(
    @Param('id') claimId: string,
    @CurrentUser() user: any,
    @Body('financeId') financeId: string,
  ) {
    return this.claimsService.inviteFinanceMember(claimId, financeId, user.id, user.role);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download claim as PDF' })
  async downloadPdf(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    try {
      const claim = await this.claimsService.findOne(id, user.id, user.role);
      const pdfBuffer = await this.pdfService.generateClaimPdf(claim as any);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${claim.claimNumber}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.status(HttpStatus.OK).end(pdfBuffer);
    } catch (error) {
      if (!res.headersSent) {
        res.status(error.status ?? HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'Failed to generate PDF',
        });
      }
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft claim' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.claimsService.remove(id, user.id, user.role);
  }
}
