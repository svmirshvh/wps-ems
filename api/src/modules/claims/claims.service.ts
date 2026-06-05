import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ClaimStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';

@Injectable()
export class ClaimsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private pdfService: PdfService,
  ) {}

  private async generateClaimNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.claim.count({
      where: { claimNumber: { startsWith: `WPS-${year}-` } },
    });
    return `WPS-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(userId: string, dto: CreateClaimDto) {
    const claimNumber = await this.generateClaimNumber();

    const claim = await (this.prisma.claim as any).create({
      data: {
        claimNumber,
        userId,
        eventName: dto.eventName,
        purpose: dto.purpose,
        department: dto.department,
        notes: dto.notes,
        status: ClaimStatus.DRAFT,
      },
      include: this.includeRelations(),
    });

    await this.auditService.log({
      userId,
      claimId: claim.id,
      action: 'CLAIM_CREATED',
      entityType: 'Claim',
      entityId: claim.id,
      metadata: { claimNumber: claim.claimNumber },
    });

    return claim;
  }

  async findAll(userId: string, userRole: Role, query: {
    status?: ClaimStatus;
    page?: number;
    limit?: number;
    search?: string;
    scope?: string; // 'assigned' | 'invited' | 'all'
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (userRole === Role.EMPLOYEE) {
      where.userId = userId;
    } else if (userRole === Role.FINANCE) {
      // Finance never sees draft claims — drafts belong to employees only
      where.status = { not: ClaimStatus.DRAFT };
      // Scoping:
      // - 'assigned': explicitly assigned to this finance user
      // - 'invited': shared with this finance user
      // - 'all' (default): assigned + invited + legacy unassigned claims
      if (query.scope === 'assigned') {
        where.assignedFinanceId = userId;
      } else if (query.scope === 'invited') {
        where.financeAccess = { some: { financeId: userId } };
      } else {
        where.OR = [
          { assignedFinanceId: null } as any,
          { assignedFinanceId: userId } as any,
          { financeAccess: { some: { financeId: userId } } } as any,
        ];
      }
    } else if (userRole === Role.BILL_HEAD) {
      // Bill head sees all non-draft claims across all employees — no assignment filter
      where.status = { not: ClaimStatus.DRAFT };
    }

    if (status) where.status = status;
    if (search) {
      const searchOr = [
        { claimNumber: { contains: search, mode: 'insensitive' } },
        { eventName: { contains: search, mode: 'insensitive' } },
        { purpose: { contains: search, mode: 'insensitive' } },
      ];
      where.OR = where.OR
        ? where.OR.map((cond: any) => ({ ...cond, ...{ AND: [{ OR: searchOr }] } }))
        : searchOr;
    }

    const [data, total] = await Promise.all([
      (this.prisma.claim as any).findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, department: true } },
          assignedFinance: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { items: true, attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.claim.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, userId: string, userRole: Role) {
    const claim = await (this.prisma.claim as any).findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });

    if (!claim) throw new NotFoundException('Claim not found');

    if (userRole === Role.EMPLOYEE && claim.userId !== userId) {
      throw new ForbiddenException('Not your claim');
    }

    // Finance members: legacy unassigned claims are open to all finance users;
    // if a claim has assignedFinanceId set, only assigned + invited members can view.
    // Bill head bypasses all assignment restrictions.
    if (userRole === Role.FINANCE) {
      const assignedFinanceId = (claim as any).assignedFinanceId;
      if (assignedFinanceId !== null && assignedFinanceId !== undefined) {
        const hasAccess =
          assignedFinanceId === userId ||
          (claim as any).financeAccess?.some((a: any) => a.financeId === userId);
        if (!hasAccess) throw new ForbiddenException('You do not have access to this claim');
      }
    }

    return claim;
  }

  async update(id: string, userId: string, userRole: Role, dto: UpdateClaimDto) {
    const claim = await this.findOne(id, userId, userRole);

    if (claim.status !== ClaimStatus.DRAFT) {
      throw new BadRequestException('Only draft claims can be edited');
    }

    const updated = await (this.prisma.claim as any).update({
      where: { id },
      data: {
        eventName: dto.eventName,
        purpose: dto.purpose,
        department: dto.department,
        notes: dto.notes,
      },
      include: this.includeRelations(),
    });

    await this.auditService.log({
      userId,
      claimId: id,
      action: 'CLAIM_UPDATED',
      entityType: 'Claim',
      entityId: id,
    });

    return updated;
  }

  async submit(id: string, userId: string, assignedFinanceId?: string) {
    const claim = await this.findOne(id, userId, Role.EMPLOYEE);

    if (claim.status !== ClaimStatus.DRAFT) {
      throw new BadRequestException('Only draft claims can be submitted');
    }

    if (claim.items.length === 0) {
      throw new BadRequestException('Cannot submit a claim with no expense items');
    }

    // Validate finance member exists if provided
    if (assignedFinanceId) {
      const financeUser = await this.prisma.user.findFirst({
        where: { id: assignedFinanceId, role: Role.FINANCE, isActive: true, deletedAt: null },
      });
      if (!financeUser) throw new BadRequestException('Selected finance member not found');
    }

    const updated = await (this.prisma.claim as any).update({
      where: { id },
      data: {
        status: ClaimStatus.SUBMITTED,
        submittedAt: new Date(),
        ...(assignedFinanceId ? { assignedFinanceId } : {}),
      },
      include: { user: true, items: true, approvals: { include: { approver: true } } },
    });

    await this.auditService.log({
      userId,
      claimId: id,
      action: 'CLAIM_SUBMITTED',
      entityType: 'Claim',
      entityId: id,
      metadata: {
        claimNumber: claim.claimNumber,
        totalAed: claim.totalAed,
        assignedFinanceId: assignedFinanceId || null,
      },
    });

    // Generate PDF and send notification asynchronously
    this.pdfService.generateClaimPdf(updated as any)
      .then(pdfBuffer => this.notificationsService.sendClaimSubmitted(updated as any, pdfBuffer))
      .catch(console.error);

    return updated;
  }

  async inviteFinanceMember(claimId: string, invitedFinanceId: string, invitedById: string, inviterRole?: Role) {
    // Verify claim exists and inviter has access
    const claim = await (this.prisma.claim as any).findFirst({
      where: { id: claimId, deletedAt: null },
      include: { financeAccess: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');

    // Bill head and admin bypass the per-claim access check
    if (inviterRole !== Role.BILL_HEAD && inviterRole !== Role.ADMIN) {
      const hasAccess =
        (claim as any).assignedFinanceId === invitedById ||
        (claim as any).financeAccess?.some((a: any) => a.financeId === invitedById);
      if (!hasAccess) throw new ForbiddenException('You do not have access to this claim');
    }

    // Verify the invited user is a finance member
    const financeUser = await this.prisma.user.findFirst({
      where: { id: invitedFinanceId, role: Role.FINANCE, isActive: true, deletedAt: null },
    });
    if (!financeUser) throw new BadRequestException('Invited user is not a Finance member');

    // Create access record (upsert to avoid duplicates)
    const access = await (this.prisma as any).claimFinanceAccess.upsert({
      where: { claimId_financeId: { claimId, financeId: invitedFinanceId } },
      create: { claimId, financeId: invitedFinanceId, invitedById },
      update: {},
      include: { finance: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }).catch(() => {
      // Table may not exist yet (migration pending) — return graceful error
      throw new BadRequestException('Finance invite feature requires DB migration. Run: npx prisma db push');
    });

    await this.auditService.log({
      userId: invitedById,
      claimId,
      action: 'FINANCE_INVITED',
      entityType: 'Claim',
      entityId: claimId,
      metadata: { invitedFinanceId, invitedFinanceName: `${financeUser.firstName} ${financeUser.lastName}` },
    });

    return access;
  }

  async recalculateTotals(claimId: string) {
    const items = await this.prisma.claimItem.findMany({ where: { claimId } });

    const totalAed = items.reduce((sum, item) => sum + Number(item.aedAmount), 0);
    const totalEur = items.reduce((sum, item) => sum + Number(item.eurAmount), 0);

    await this.prisma.claim.update({
      where: { id: claimId },
      data: { totalAed, totalEur },
    });
  }

  async remove(id: string, userId: string, userRole: Role) {
    const claim = await this.findOne(id, userId, userRole);

    if (claim.status !== ClaimStatus.DRAFT) {
      throw new BadRequestException('Only draft claims can be deleted');
    }

    await this.prisma.claim.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      claimId: id,
      action: 'CLAIM_DELETED',
      entityType: 'Claim',
      entityId: id,
    });

    return { message: 'Claim deleted' };
  }

  async getDashboardStats(userId: string, userRole: Role) {
    const where: any = userRole === Role.EMPLOYEE
      ? { userId, deletedAt: null }
      : userRole === Role.FINANCE
      ? {
          deletedAt: null,
          status: { not: ClaimStatus.DRAFT },
          OR: [
            { assignedFinanceId: null } as any,
            { assignedFinanceId: userId } as any,
            { financeAccess: { some: { financeId: userId } } } as any,
          ],
        }
      : userRole === Role.BILL_HEAD
      ? { deletedAt: null, status: { not: ClaimStatus.DRAFT } }
      : { deletedAt: null };

    // Single groupBy query instead of 6 separate COUNTs
    const [statusGroups, recentClaims] = await Promise.all([
      this.prisma.claim.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.claim.findMany({
        where: userRole === Role.EMPLOYEE
          ? { ...where }
          : { ...where, status: { not: ClaimStatus.DRAFT } },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const counts: Record<string, number> = {};
    statusGroups.forEach((g) => { counts[g.status] = g._count._all; });

    return {
      draft: counts[ClaimStatus.DRAFT] ?? 0,
      submitted: counts[ClaimStatus.SUBMITTED] ?? 0,
      managerApproved: counts[ClaimStatus.MANAGER_APPROVED] ?? 0,
      financeApproved: counts[ClaimStatus.FINANCE_APPROVED] ?? 0,
      paid: counts[ClaimStatus.PAID] ?? 0,
      rejected: counts[ClaimStatus.REJECTED] ?? 0,
      recentClaims,
    };
  }

  async getFinanceMembers() {
    return this.prisma.user.findMany({
      where: { role: Role.FINANCE, isActive: true, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true, department: true },
      orderBy: { firstName: 'asc' },
    });
  }

  private includeRelations(): any {
    return {
      user: {
        select: {
          id: true, email: true, firstName: true, lastName: true,
          accountNo: true, iban: true, swift: true, bankName: true, department: true,
        },
      },
      assignedFinance: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      financeAccess: {
        include: {
          finance: { select: { id: true, firstName: true, lastName: true, email: true } },
          invitedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      items: { orderBy: { lineOrder: 'asc' as const } },
      approvals: {
        include: { approver: { select: { id: true, firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: 'asc' as const },
      },
      attachments: { orderBy: { createdAt: 'asc' as const } },
      auditLogs: {
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }
}
