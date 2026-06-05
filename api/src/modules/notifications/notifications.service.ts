import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class NotificationsService {
  private resend: Resend;
  private fromEmail: string;
  private financeEmail: string;
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private config: ConfigService) {
    const apiKey = config.get('RESEND_API_KEY');
    if (apiKey) this.resend = new Resend(apiKey);
    this.fromEmail = config.get('RESEND_FROM_EMAIL', 'noreply@wps.ae');
    this.financeEmail = config.get('FINANCE_EMAIL', 'finance@wps.ae');
  }

  async sendClaimSubmitted(claim: any, pdfBuffer?: Buffer) {
    if (!this.resend) { this.logger.warn('Resend not configured'); return; }

    const claimantName = `${claim.user.firstName} ${claim.user.lastName}`;
    const html = this.buildEmailHtml('Claim Submitted', `
      <p>Dear ${claimantName},</p>
      <p>Your expense claim <strong>${claim.claimNumber}</strong> has been submitted successfully and is pending manager approval.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Claim Number</strong></td><td style="padding:8px;border:1px solid #ddd">${claim.claimNumber}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Event/Purpose</strong></td><td style="padding:8px;border:1px solid #ddd">${claim.eventName || claim.purpose || '-'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Total Amount (AED)</strong></td><td style="padding:8px;border:1px solid #ddd">${Number(claim.totalAed).toFixed(2)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Items</strong></td><td style="padding:8px;border:1px solid #ddd">${claim.items?.length || 0}</td></tr>
      </table>
      <p>You will be notified once the claim is reviewed.</p>
    `);

    const attachments = pdfBuffer
      ? [{ filename: `${claim.claimNumber}.pdf`, content: pdfBuffer }]
      : [];

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: [claim.user.email, this.financeEmail],
        subject: `[WPS EMS] Claim ${claim.claimNumber} Submitted`,
        html,
        attachments,
      } as any);
    } catch (e) { this.logger.error('Failed to send claim submitted email', e); }
  }

  async sendClaimApproved(claim: any) {
    if (!this.resend) return;

    const claimantName = `${claim.user.firstName} ${claim.user.lastName}`;
    const html = this.buildEmailHtml('Claim Approved', `
      <p>Dear ${claimantName},</p>
      <p>Your expense claim <strong>${claim.claimNumber}</strong> has been <span style="color:#4CAF50;font-weight:bold">APPROVED</span>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Claim Number</strong></td><td style="padding:8px;border:1px solid #ddd">${claim.claimNumber}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Status</strong></td><td style="padding:8px;border:1px solid #ddd">${claim.status}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Total Amount (AED)</strong></td><td style="padding:8px;border:1px solid #ddd">${Number(claim.totalAed).toFixed(2)}</td></tr>
      </table>
      <p>Payment will be processed according to the standard payroll cycle.</p>
    `);

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: [claim.user.email],
        subject: `[WPS EMS] Claim ${claim.claimNumber} Approved`,
        html,
      });
    } catch (e) { this.logger.error('Failed to send approval email', e); }
  }

  async sendClaimRejected(claim: any, reason?: string) {
    if (!this.resend) return;

    const claimantName = `${claim.user.firstName} ${claim.user.lastName}`;
    const html = this.buildEmailHtml('Claim Rejected', `
      <p>Dear ${claimantName},</p>
      <p>Your expense claim <strong>${claim.claimNumber}</strong> has been <span style="color:#CC0000;font-weight:bold">REJECTED</span>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please review the feedback and resubmit if applicable. Contact your manager or finance for more information.</p>
    `);

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: [claim.user.email],
        subject: `[WPS EMS] Claim ${claim.claimNumber} Rejected`,
        html,
      });
    } catch (e) { this.logger.error('Failed to send rejection email', e); }
  }

  async sendFinanceReviewRequired(claim: any) {
    if (!this.resend) return;

    const html = this.buildEmailHtml('Finance Review Required', `
      <p>Dear Finance Team,</p>
      <p>Claim <strong>${claim.claimNumber}</strong> by <strong>${claim.user.firstName} ${claim.user.lastName}</strong> has been approved by the manager and requires your review.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Claim Number</strong></td><td style="padding:8px;border:1px solid #ddd">${claim.claimNumber}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Employee</strong></td><td style="padding:8px;border:1px solid #ddd">${claim.user.firstName} ${claim.user.lastName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Department</strong></td><td style="padding:8px;border:1px solid #ddd">${claim.department || claim.user.department || '-'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Total Amount (AED)</strong></td><td style="padding:8px;border:1px solid #ddd">${Number(claim.totalAed).toFixed(2)}</td></tr>
      </table>
      <p>Please login to the WPS Expense Management System to review and process this claim.</p>
    `);

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: [this.financeEmail],
        subject: `[WPS EMS] Finance Review Required - ${claim.claimNumber}`,
        html,
      });
    } catch (e) { this.logger.error('Failed to send finance notification', e); }
  }

  private buildEmailHtml(title: string, content: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
        <tr>
          <td style="background:#CC0000;padding:24px 32px">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">WÜRTH PROFESSIONAL SOLUTIONS</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:14px">Expense Management System</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 16px;color:#000;font-size:18px">${title}</h2>
            ${content}
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
            <p style="margin:0;color:#959595;font-size:12px">This is an automated message from WPS Expense Management System. Please do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
