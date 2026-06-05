import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateClaimPdf(claim: any): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
        ],
      });

      const page = await browser.newPage();
      const html = this.buildHtml(claim);
      await page.setContent(html, { waitUntil: 'load' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      });

      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error('PDF generation failed', error);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }

  private buildHtml(claim: any): string {
    const user = claim.user;
    const items = claim.items || [];
    const approvals = claim.approvals || [];

    // Group items by category
    const categories = [
      { code: 'A', name: 'A: Travel Expenses' },
      { code: 'B', name: 'B: Office Supplies' },
      { code: 'C', name: 'C: Meals & Entertainment - Clients' },
      { code: 'D', name: 'D: Telecommunication' },
      { code: 'E', name: 'E: Marketing' },
      { code: 'F', name: 'F: Logistics' },
      { code: 'G', name: 'G: Others' },
    ];

    const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fmtDate = (d: string | Date) => {
      const date = new Date(d);
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    const categoryRows = categories.map(cat => {
      const catItems = items.filter((i: any) => i.categoryCode === cat.code);
      const subTotalAed = catItems.reduce((s: number, i: any) => s + Number(i.aedAmount), 0);
      const subTotalEur = catItems.reduce((s: number, i: any) => s + Number(i.eurAmount), 0);

      const rows = catItems.map((item: any) => `
        <tr>
          <td>${fmtDate(item.expenseDate)}</td>
          <td>${item.plCostTypeNr || '-'}</td>
          <td>${item.plCostTypeName || item.description}</td>
          <td>${item.pillarName || '-'}</td>
          <td>${item.description}</td>
          <td>${item.country || '-'}</td>
          <td>${item.currency !== 'AED' ? `${item.currency} ${fmt(Number(item.originalAmount))}` : '-'}</td>
          <td style="text-align:right">${fmt(Number(item.aedAmount))}</td>
          <td>${item.receiptNumber || '-'}</td>
          <td style="text-align:right">${fmt(Number(item.eurAmount))}</td>
        </tr>
      `).join('');

      return `
        <tr class="cat-header">
          <td colspan="10"><strong>${cat.name}</strong></td>
        </tr>
        ${rows}
        ${catItems.length > 0 ? `
          <tr class="subtotal-row">
            <td colspan="7"></td>
            <td style="text-align:right"><strong>AED ${fmt(subTotalAed)}</strong></td>
            <td><strong>Sub Total ${cat.code}</strong></td>
            <td style="text-align:right"><strong>EUR ${fmt(subTotalEur)}</strong></td>
          </tr>
        ` : `<tr><td colspan="10" style="text-align:center;color:#999;font-style:italic">No expenses in this category</td></tr>`}
      `;
    }).join('');

    const approvalRows = approvals.map((a: any) => `
      <tr>
        <td>${a.approver?.firstName} ${a.approver?.lastName}</td>
        <td>${a.approver?.role}</td>
        <td>${a.action.replace(/_/g, ' ')}</td>
        <td>${fmtDate(a.createdAt)}</td>
        <td>${a.comment || '-'}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; }
  .header { background: #CC0000; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 16pt; font-weight: 700; }
  .header h2 { font-size: 12pt; font-weight: 400; }
  .header-right { text-align: right; font-size: 9pt; }
  .meta-section { padding: 12px 20px; background: #f8f8f8; border-bottom: 2px solid #CC0000; }
  .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .meta-item label { font-size: 7pt; color: #666; text-transform: uppercase; display: block; margin-bottom: 2px; }
  .meta-item span { font-size: 9pt; font-weight: 600; }
  .section { padding: 8px 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 8pt; }
  th { background: #000; color: white; padding: 6px 4px; text-align: left; font-size: 7.5pt; }
  td { padding: 4px; border-bottom: 1px solid #eee; vertical-align: top; }
  .cat-header td { background: #DEDEDE; font-weight: 700; padding: 5px 4px; color: #000; }
  .subtotal-row td { background: #f0f0f0; font-weight: 700; border-top: 1px solid #000; }
  .total-section { margin: 8px 20px; padding: 12px; background: #000; color: white; display: flex; justify-content: flex-end; gap: 40px; }
  .total-section .total-item { text-align: right; }
  .total-section .total-item label { font-size: 8pt; opacity: 0.7; display: block; }
  .total-section .total-item span { font-size: 14pt; font-weight: 700; }
  .disclaimer { padding: 8px 20px; font-size: 7.5pt; color: #555; border-top: 1px solid #ddd; }
  .bank-section { padding: 8px 20px; background: #f8f8f8; }
  .bank-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .approval-section { padding: 8px 20px; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 8pt; font-weight: 700; }
  .status-DRAFT { background: #DEDEDE; color: #555; }
  .status-SUBMITTED { background: #009EE0; color: white; }
  .status-MANAGER_APPROVED { background: #B9C900; color: white; }
  .status-FINANCE_APPROVED { background: #B9C900; color: white; }
  .status-PAID { background: #2e7d32; color: white; }
  .status-REJECTED { background: #CC0000; color: white; }
  .invoice-note { padding: 4px 20px; font-size: 7.5pt; font-style: italic; color: #555; }
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>WÜRTH PROFESSIONAL SOLUTIONS</h1>
    <h2>Expense Claim Form</h2>
  </div>
  <div class="header-right">
    <div><strong>${claim.claimNumber}</strong></div>
    <div>${fmtDate(claim.createdAt)}</div>
    <div><span class="status-badge status-${claim.status}">${claim.status.replace(/_/g, ' ')}</span></div>
  </div>
</div>

<div class="meta-section">
  <div class="meta-grid">
    <div class="meta-item">
      <label>Employee Name</label>
      <span>${user.lastName}, ${user.firstName}</span>
    </div>
    <div class="meta-item">
      <label>Account No.</label>
      <span>${user.accountNo || '-'}</span>
    </div>
    <div class="meta-item">
      <label>Department</label>
      <span>${claim.department || user.department || '-'}</span>
    </div>
    <div class="meta-item">
      <label>Submission Date</label>
      <span>${claim.submittedAt ? fmtDate(claim.submittedAt) : '-'}</span>
    </div>
    <div class="meta-item" style="grid-column: span 2">
      <label>Event Name / Purpose</label>
      <span>${claim.eventName || claim.purpose || '-'}</span>
    </div>
    <div class="meta-item">
      <label>Email</label>
      <span>${user.email}</span>
    </div>
    <div class="meta-item">
      <label>Claim Reference</label>
      <span>${claim.claimNumber}</span>
    </div>
  </div>
</div>

<div class="section">
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>PL Nr</th>
        <th>PL Cost Type</th>
        <th>Pillar</th>
        <th>Description</th>
        <th>Country</th>
        <th>Orig. Currency</th>
        <th>AED Amount</th>
        <th>Receipt No.</th>
        <th>EUR Amount</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRows}
    </tbody>
  </table>
</div>

<div class="invoice-note">* Invoice is not subject to VAT unless otherwise stated on receipt</div>

<div class="total-section">
  <div class="total-item">
    <label>TOTAL EUR AMOUNT</label>
    <span>EUR ${fmt(Number(claim.totalEur))}</span>
  </div>
  <div class="total-item">
    <label>TOTAL AED AMOUNT</label>
    <span>AED ${fmt(Number(claim.totalAed))}</span>
  </div>
</div>

<div class="disclaimer">
  <p>PLEASE MAKE SURE TO ATTACH ALL THE RECEIPTS YOU ARE CLAIMING.</p>
  <p>Expenses will be only reimbursed after presentation of full documentation, copy of original receipts and only for company-related expenses that have been pre-authorized in writing by the Office.</p>
</div>

<div class="bank-section">
  <strong>Bank Details</strong>
  <div class="bank-grid" style="margin-top:6px">
    <div class="meta-item"><label>Account Holder</label><span>${user.firstName} ${user.lastName}</span></div>
    <div class="meta-item"><label>IBAN</label><span>${user.iban || '-'}</span></div>
    <div class="meta-item"><label>SWIFT/BIC</label><span>${user.swift || '-'}</span></div>
    <div class="meta-item"><label>Bank</label><span>${user.bankName || '-'}</span></div>
  </div>
</div>

${approvals.length > 0 ? `
<div class="approval-section">
  <strong>Approval History</strong>
  <table style="margin-top:6px">
    <thead>
      <tr>
        <th>Approver</th>
        <th>Role</th>
        <th>Action</th>
        <th>Date</th>
        <th>Comment</th>
      </tr>
    </thead>
    <tbody>${approvalRows}</tbody>
  </table>
</div>
` : ''}

</body>
</html>`;
  }
}
