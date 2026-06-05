import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClaimItemsService } from './claim-items.service';
import { CreateClaimItemDto } from './dto/create-claim-item.dto';
import { UpdateClaimItemDto } from './dto/update-claim-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Claim Items')
@ApiBearerAuth()
@Controller('claims/:claimId/items')
export class ClaimItemsController {
  constructor(private claimItemsService: ClaimItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Add expense item to claim' })
  create(
    @Param('claimId') claimId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateClaimItemDto,
  ) {
    return this.claimItemsService.create(claimId, user.id, user.role, dto);
  }

  @Put(':itemId')
  @ApiOperation({ summary: 'Update expense item' })
  update(
    @Param('claimId') claimId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateClaimItemDto,
  ) {
    return this.claimItemsService.update(claimId, itemId, user.id, user.role, dto);
  }

  @Delete(':itemId')
  @ApiOperation({ summary: 'Remove expense item' })
  remove(
    @Param('claimId') claimId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
  ) {
    return this.claimItemsService.remove(claimId, itemId, user.id, user.role);
  }
}
