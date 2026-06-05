import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ClaimStatus, ApprovalAction, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApproveClaimDto } from './dto/approve-claim.dto';

@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  async getPendingClaims(userRole: Role, userId?: string) {
    if (userRole === Role.MANAGER) {
      return this.prisma.claim.findMany({
        where: { status: ClaimStatus.SUBMITTED, deletedAt: null },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, department: true } },
          _count: { select: { items: true } },
        },
        orderBy: { submittedAt: 'asc' },
      });
    }

    if (userRole === Role.FINANCE) {
      return (this.prisma.claim as any).findMany({
        where: {
          status: ClaimStatus.MANAGER_APPROVED,
          deletedAt: null,
          OR: userId
            ? [
                { assignedFinanceId: null },
                { assignedFinanceId: userId },
                { financeAccess: { some: { financeId: userId } } },
              ]
            : undefined,
        },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, department: true } },
          assignedFinance: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { submittedAt: 'asc' },
      });
    }

    if (userRole === Role.BILL_HEAD) {
      // Bill head sees ALL pending claims across all finance users — no assignment filter
      return (this.prisma.claim as any).findMany({
        where: {
          status: { in: [ClaimStatus.MANAGER_APPROVED, ClaimStatus.FINANCE_APPROVED] },
          deletedAt: null,
        },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, department: true } },
          assignedFinance: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { submittedAt: 'asc' },
      });
    }

    return [];
  }

  async approve(claimId: string, approverId: string, approverRole: Role, dto: ApproveClaimDto) {
    const claim = await this.prisma.claim.findFirst({
      where: { id: claimId, deletedAt: null },
      include: { user: true, items: true, approvals: { include: { approver: true } } },
    });

    if (!claim) throw new NotFoundException('Claim not found');

    let action: ApprovalAction;
    let newStatus: ClaimStatus;

    if (approverRole === Role.MANAGER) {
      if (claim.status !== ClaimStatus.SUBMITTED) {
        throw new BadRequestException('Claim is not in SUBMITTED status');
      }
      if (dto.action === 'approve') {
        action = ApprovalAction.MANAGER_APPROVED;
        newStatus = ClaimStatus.MANAGER_APPROVED;
      } else {
        action = ApprovalAction.MANAGER_REJECTED;
        newStatus = ClaimStatus.REJECTED;
      }
    } else if (approverRole === Role.FINANCE || approverRole === Role.BILL_HEAD) {
      if (dto.action === 'approve') {
        if (claim.status === ClaimStatus.MANAGER_APPROVED) {
          action = ApprovalAction.FINANCE_APPROVED;
          newStatus = ClaimStatus.FINANCE_APPROVED;
        } else if (claim.status === ClaimStatus.FINANCE_APPROVED) {
          action = ApprovalAction.MARKED_PAID;
          newStatus = ClaimStatus.PAID;
        } else {
          throw new BadRequestException('Invalid claim status for finance approval');
        }
      } else {
        action = ApprovalAction.FINANCE_REJECTED;
        newStatus = ClaimStatus.REJECTED;
      }
    } else {
      throw new ForbiddenException('Only managers and finance can approve claims');
    }

    const [approval, updatedClaim] = await this.prisma.$transaction([
      this.prisma.approval.create({
        data: { claimId, approverId, action, comment: dto.comment },
      }),
      this.prisma.claim.update({
        where: { id: claimId },
        data: { status: newStatus },
        include: { user: true, items: true, approvals: { include: { approver: true } } },
      }),
    ]);

    await this.auditService.log({
      userId: approverId,
      claimId,
      action: action.toString(),
      entityType: 'Claim',
      entityId: claimId,
      metadata: { comment: dto.comment, newStatus },
    });

    // Send email notifications
    if (newStatus === ClaimStatus.FINANCE_APPROVED || newStatus === ClaimStatus.PAID) {
      this.notificationsService.sendClaimApproved(updatedClaim as any).catch(console.error);
    } else if (newStatus === ClaimStatus.REJECTED) {
      this.notificationsService.sendClaimRejected(updatedClaim as any, dto.comment).catch(console.error);
    } else if (newStatus === ClaimStatus.MANAGER_APPROVED) {
      this.notificationsService.sendFinanceReviewRequired(updatedClaim as any).catch(console.error);
    }

    return { approval, claim: updatedClaim };
  }

  async reopen(claimId: string, userId: string, userRole: Role) {
    if (userRole !== Role.FINANCE && userRole !== Role.BILL_HEAD && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only finance/admin can reopen claims');
    }

    const claim = await this.prisma.claim.findFirst({
      where: { id: claimId, deletedAt: null },
    });

    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== ClaimStatus.REJECTED) {
      throw new BadRequestException('Only rejected claims can be reopened');
    }

    const [approval, updatedClaim] = await this.prisma.$transaction([
      this.prisma.approval.create({
        data: {
          claimId,
          approverId: userId,
          action: ApprovalAction.REOPENED,
          comment: 'Claim reopened for editing',
        },
      }),
      this.prisma.claim.update({
        where: { id: claimId },
        data: { status: ClaimStatus.DRAFT },
      }),
    ]);

    await this.auditService.log({
      userId,
      claimId,
      action: 'CLAIM_REOPENED',
      entityType: 'Claim',
      entityId: claimId,
    });

    return { approval, claim: updatedClaim };
  }
}
