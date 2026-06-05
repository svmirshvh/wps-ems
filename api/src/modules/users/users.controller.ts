import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.FINANCE, Role.BILL_HEAD, Role.MANAGER)
  findAll(@Query('role') role?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.usersService.findAll({ role, page, limit });
  }

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FINANCE, Role.BILL_HEAD)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    // Passes the requestor's role so bank fields are stripped for non-finance
    return this.usersService.updateProfile(user.id, dto, user.role);
  }

  // Finance/BillHead: update bank details of a specific employee
  @Put(':id/bank-details')
  @Roles(Role.FINANCE, Role.BILL_HEAD, Role.ADMIN)
  @ApiOperation({ summary: 'Finance: update employee bank details' })
  updateBankDetails(
    @Param('id') targetUserId: string,
    @CurrentUser('id') financeUserId: string,
    @Body() body: { accountNo?: string; iban?: string; swift?: string; bankName?: string },
  ) {
    return this.usersService.updateBankDetails(targetUserId, financeUserId, body);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
