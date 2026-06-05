import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BANK_FIELDS = ['accountNo', 'iban', 'swift', 'bankName'];

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { role?: string; page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { role } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (role) where.role = role;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.safeSelect(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: this.safeSelect(),
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { ...dto, passwordHash, password: undefined } as any,
      select: this.safeSelect(),
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      delete data.password;
    }
    return this.prisma.user.update({ where: { id }, data, select: this.safeSelect() });
  }

  // Profile update: employees CANNOT change bank details
  async updateProfile(userId: string, dto: UpdateUserDto, requestorRole: string) {
    const data: any = { ...dto };

    // Strip bank fields for non-finance roles (employees and managers cannot change bank details)
    if (requestorRole !== 'FINANCE' && requestorRole !== 'BILL_HEAD' && requestorRole !== 'ADMIN') {
      for (const field of BANK_FIELDS) {
        delete data[field];
      }
    }

    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 12);
      delete data.password;
    }

    return this.prisma.user.update({ where: { id: userId }, data, select: this.safeSelect() });
  }

  // Finance-only: update bank details of any employee
  async updateBankDetails(
    targetUserId: string,
    financeUserId: string,
    bankData: { accountNo?: string; iban?: string; swift?: string; bankName?: string },
  ) {
    const target = await this.findOne(targetUserId);
    if (!target) throw new NotFoundException('Employee not found');

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        accountNo: bankData.accountNo,
        iban: bankData.iban,
        swift: bankData.swift,
        bankName: bankData.bankName,
      },
      select: this.safeSelect(),
    });

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { message: 'User deleted' };
  }

  private safeSelect() {
    return {
      id: true, email: true, firstName: true, lastName: true,
      role: true, accountNo: true, iban: true, swift: true,
      bankName: true, department: true, isActive: true,
      createdAt: true, updatedAt: true,
    };
  }
}
