import {
  Controller, Post, Get, Delete, Param, Query,
  UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload receipt or document' })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Query('claimId') claimId?: string,
    @Query('claimItemId') claimItemId?: string,
  ) {
    return this.attachmentsService.upload(file, userId, claimId, claimItemId);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get signed URL for attachment' })
  getSignedUrl(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.attachmentsService.getSignedUrl(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete attachment' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.attachmentsService.remove(id, userId);
  }
}
