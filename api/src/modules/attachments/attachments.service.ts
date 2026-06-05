import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const RECEIPTS_BUCKET = 'expense-receipts';
const PDFS_BUCKET = 'expense-pdfs';

@Injectable()
export class AttachmentsService {
  private supabase;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private auditService: AuditService,
  ) {
    this.supabase = createClient(
      config.get<string>('SUPABASE_URL', ''),
      config.get<string>('SUPABASE_SERVICE_KEY', ''),
    );
  }

  async upload(
    file: Express.Multer.File,
    userId: string,
    claimId?: string,
    claimItemId?: string,
  ) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const bucket = file.mimetype === 'application/pdf' ? PDFS_BUCKET : RECEIPTS_BUCKET;
    const ext = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    const storagePath = claimId ? `${claimId}/${filename}` : `temp/${filename}`;

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new BadRequestException(`Upload failed: ${error.message}`);

    const attachment = await this.prisma.attachment.create({
      data: {
        claimId,
        claimItemId,
        uploadedById: userId,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath,
        bucket,
        isCompressed: false,
      },
    });

    await this.auditService.log({
      userId,
      claimId,
      action: 'RECEIPT_UPLOADED',
      entityType: 'Attachment',
      entityId: attachment.id,
      metadata: { originalName: file.originalname, fileSize: file.size },
    });

    return attachment;
  }

  async getSignedUrl(id: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const { data, error } = await this.supabase.storage
      .from(attachment.bucket)
      .createSignedUrl(attachment.storagePath, 3600);

    if (error) throw new BadRequestException(`Could not generate URL: ${error.message}`);

    return { url: data.signedUrl, attachment };
  }

  async storePdf(buffer: Buffer, claimId: string, claimNumber: string): Promise<string> {
    const filename = `${claimNumber}.pdf`;
    const storagePath = `${claimId}/${filename}`;

    const { error } = await this.supabase.storage
      .from(PDFS_BUCKET)
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: true });

    if (error) throw new BadRequestException(`PDF storage failed: ${error.message}`);
    return storagePath;
  }

  async remove(id: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.supabase.storage.from(attachment.bucket).remove([attachment.storagePath]);
    await this.prisma.attachment.delete({ where: { id } });

    return { message: 'Attachment removed' };
  }

  async findByClaimId(claimId: string) {
    return this.prisma.attachment.findMany({
      where: { claimId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
