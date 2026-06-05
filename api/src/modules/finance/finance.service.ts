import { Injectable } from '@nestjs/common';
import { ClaimStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(filters: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    department?: string;
    status?: ClaimStatus;
  }) {
    const where: any = { deletedAt: null };

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters.userId) where.userId = filters.userId;
    if (filters.department) where.department = filters.department;
    if (filters.status) where.status = filters.status;

    // Batch: groupBy for counts + aggregates + recent claims + monthly data
    const [statusGroups, pendingAmount, approvedAmount, paidAmount, recentClaims, monthlyData] = await Promise.all([
      this.prisma.claim.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.claim.aggregate({ where: { ...where, status: ClaimStatus.SUBMITTED }, _sum: { totalAed: true } }),
      this.prisma.claim.aggregate({ where: { ...where, status: { in: [ClaimStatus.MANAGER_APPROVED, ClaimStatus.FINANCE_APPROVED] } }, _sum: { totalAed: true } }),
      this.prisma.claim.aggregate({ where: { ...where, status: ClaimStatus.PAID }, _sum: { totalAed: true } }),
      this.prisma.claim.findMany({
        where: { ...where, status: { not: ClaimStatus.DRAFT } },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, department: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.getMonthlyData(),
    ]);

    const counts: Record<string, number> = {};
    statusGroups.forEach((g: any) => { counts[g.status] = g._count._all; });

    const totalPending = counts[ClaimStatus.SUBMITTED] ?? 0;
    const totalApproved = (counts[ClaimStatus.MANAGER_APPROVED] ?? 0) + (counts[ClaimStatus.FINANCE_APPROVED] ?? 0);
    const totalRejected = counts[ClaimStatus.REJECTED] ?? 0;
    const totalPaid = counts[ClaimStatus.PAID] ?? 0;

    return {
      kpis: {
        totalPending,
        totalApproved,
        totalRejected,
        totalPaid,
        pendingAmount: Number(pendingAmount._sum.totalAed) || 0,
        approvedAmount: Number(approvedAmount._sum.totalAed) || 0,
        paidAmount: Number(paidAmount._sum.totalAed) || 0,
      },
      recentClaims,
      monthlyData,
    };
  }

  async getClaimsForExport(filters: {
    startDate?: string;
    endDate?: string;
    status?: ClaimStatus;
  }) {
    const where: any = { deletedAt: null };

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters.status) where.status = filters.status;

    return this.prisma.claim.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, department: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getMonthlyData() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const claims = await this.prisma.claim.findMany({
      where: { createdAt: { gte: sixMonthsAgo }, deletedAt: null },
      select: { createdAt: true, totalAed: true, status: true },
    });

    const monthly: Record<string, { month: string; total: number; count: number }> = {};

    claims.forEach((claim) => {
      const key = `${claim.createdAt.getFullYear()}-${String(claim.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { month: key, total: 0, count: 0 };
      monthly[key].total += Number(claim.totalAed);
      monthly[key].count += 1;
    });

    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  }
}
