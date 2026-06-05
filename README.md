# WPS Expense Management System

Live URL : https://wps-ems.vercel.app/

**Würth Professional Solutions — Enterprise Expense Management**

A production-grade web application replacing the existing Excel-based expense claim process. Built mobile-first with a full approval workflow, finance dashboard, PDF generation, and audit trail.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                      │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Employee UI  │  │  Manager UI   │  │   Finance UI      │  │
│  │  Dashboard   │  │  Approvals    │  │   Dashboard       │  │
│  │  New Claim   │  │  Review       │  │   Export/KPIs     │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │ REST API (JWT)
┌─────────────────────────────▼───────────────────────────────┐
│                   Backend (NestJS API)                        │
│  ┌──────┐ ┌───────┐ ┌────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Auth │ │Claims │ │Approvs │ │ Finance  │ │  PDF/Email│  │
│  └──────┘ └───────┘ └────────┘ └──────────┘ └───────────┘  │
│                    Prisma ORM                                 │
└──────────┬──────────────────────────────┬────────────────────┘
           │                              │
    ┌──────▼──────┐               ┌──────▼──────┐
    │ PostgreSQL  │               │  Supabase   │
    │ (Supabase)  │               │  Storage    │
    └─────────────┘               └─────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Next.js 14 |
| UI Components | shadcn/ui + Tailwind CSS |
| State Management | Zustand (auth) + TanStack Query (server) |
| Form Handling | React Hook Form + Zod |
| Backend Framework | NestJS (Modular Monolith) |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |
| File Storage | Supabase Storage |
| Authentication | JWT (Access + Refresh tokens) |
| PDF Generation | Puppeteer |
| Email | Resend |
| Image Compression | browser-image-compression |

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16 (or Supabase project)
- (Optional) Supabase account for storage

### 1. Setup Backend

```bash
cd api
cp .env.example .env
# Edit .env with your values

npm install
npx prisma generate
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run start:dev
```

API runs on: `http://localhost:3001`
Swagger docs: `http://localhost:3001/api/docs`

### 2. Setup Frontend

```bash
cd web
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

npm install
npm run dev
```

App runs on: `http://localhost:3000`

### 3. Docker (Full Stack)

```bash
docker-compose up -d
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|---------|
| Employee | employee@wps.local | Employee@123 |
| Manager | manager@wps.local | Manager@123 |
| Finance | finance@wps.local | Finance@123 |
| Admin | admin@wps.local | Admin@123 |

---

## Supabase Setup

### 1. Create Project
1. Go to [supabase.com](https://supabase.com) and create a project
2. Copy the project URL and service role key to `.env`

### 2. Create Storage Buckets
Run in Supabase SQL Editor:
```sql
-- These buckets are created via the Supabase dashboard or API
-- Storage > New Bucket: expense-receipts (private)
-- Storage > New Bucket: expense-pdfs (private)
```

Or via Supabase Storage UI:
1. Go to Storage → New Bucket
2. Create `expense-receipts` (Private)
3. Create `expense-pdfs` (Private)

### 3. Storage Policies
Both buckets are private. Signed URLs are generated server-side for secure access.

---

## Database ERD

```
users ──────────────────────────────────────────────────
│ id (PK), email, password_hash, first_name, last_name  │
│ role (EMPLOYEE|MANAGER|FINANCE|ADMIN)                  │
│ account_no, iban, swift, bank_name, department         │
└────────────────────────┬───────────────────────────────

claims ──────────────────▼─────────────────────────────────
│ id (PK), claim_number (UNIQUE), user_id (FK→users)    │
│ event_name, purpose, department, status, notes        │
│ total_aed, total_eur, submitted_at                    │
└─────────┬──────────────────────────────────────────────

claim_items ──────────────▼───────────────────────────────
│ id (PK), claim_id (FK→claims), line_order             │
│ expense_date, category_code, category_name            │
│ pl_cost_type_nr, pl_cost_type_name, pillar_name      │
│ description, country, currency                        │
│ original_amount, exchange_rate_used                   │
│ aed_amount, eur_amount, receipt_number                │
└──────────────────────────────────────────────────────

attachments ──────────────────────────────────────────────
│ id, claim_id (FK), claim_item_id (FK)                 │
│ filename, original_name, mime_type, file_size         │
│ storage_path, bucket, is_compressed                   │
└──────────────────────────────────────────────────────

exchange_rates ───────────────────────────────────────────
│ id, base_currency, target_currency, rate              │
│ effective_date                                        │
│ UNIQUE(base_currency, target_currency, effective_date)│
└──────────────────────────────────────────────────────

approvals ────────────────────────────────────────────────
│ id, claim_id (FK), approver_id (FK→users)             │
│ action (ENUM), comment, created_at                    │
└──────────────────────────────────────────────────────

audit_logs ───────────────────────────────────────────────
│ id, user_id (FK), claim_id (FK)                       │
│ action, entity_type, entity_id                        │
│ metadata (JSON), ip_address, created_at               │
└──────────────────────────────────────────────────────

refresh_tokens ───────────────────────────────────────────
│ id, user_id (FK), token (UNIQUE), expires_at          │
└──────────────────────────────────────────────────────
```

---

## Approval Workflow

```
Employee creates claim (DRAFT)
         │
         ▼
  Employee submits (SUBMITTED)
         │
         ▼
  Manager reviews → REJECT → (REJECTED) ← can be REOPENED by Finance
         │ APPROVE
         ▼
  (MANAGER_APPROVED)
         │
         ▼
  Finance reviews → REJECT → (REJECTED)
         │ APPROVE
         ▼
  (FINANCE_APPROVED)
         │
         ▼
  Finance marks paid → (PAID)
```

---

## API Documentation

Full Swagger docs available at `/api/docs` when running the backend.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Login |
| POST | /auth/refresh | Refresh token |
| POST | /auth/logout | Logout |
| GET | /auth/me | Current user |
| GET | /claims | List claims |
| POST | /claims | Create claim |
| GET | /claims/:id | Get claim |
| PUT | /claims/:id | Update claim |
| POST | /claims/:id/submit | Submit claim |
| GET | /claims/:id/pdf | Download PDF |
| POST | /claims/:claimId/items | Add expense item |
| PUT | /claims/:claimId/items/:itemId | Update item |
| DELETE | /claims/:claimId/items/:itemId | Remove item |
| GET | /approvals/pending | Get pending approvals |
| POST | /approvals/:claimId | Approve/reject claim |
| GET | /finance/dashboard | Finance KPIs |
| GET | /finance/export | Export data |
| POST | /attachments/upload | Upload receipt |
| GET | /exchange-rates/latest | Current FX rates |
| GET | /audit-logs | Audit trail |

---

## Expense Categories (from Excel)

| Code | Category | PL Numbers |
|------|----------|-----------|
| A | Travel Expenses | 4412212, 4412213, 4412216, 4412217 |
| B | Office Supplies | 4412916 |
| C | Meals & Entertainment | 4412218 |
| D | Telecommunication | 4412411 |
| E | Marketing | 4411918, 4411921, 4411911, 4411913 |
| F | Logistics | 4411812 |
| G | Others | — |

---

## Currency Support

| Currency | To AED Rate |
|----------|------------|
| AED | 1.0 (base) |
| USD | 3.6725 |
| EUR | 4.31 (matches Excel) |
| TRY | 0.1065 |
| CNY | 0.5045 |

Exchange rates are stored in the database and can be updated via the Admin interface. When a claim is submitted, the rate is frozen permanently for auditability.

---

## PDF Generation

Generated by Puppeteer from an HTML template that mirrors the WPS Excel form:
- Employee header with name, account number, department
- Expense lines grouped by category (A–G)
- Sub-totals per category in AED and EUR
- Grand total row
- Bank details section
- Approval history
- Claim reference number and status

---

## Security

- JWT authentication with 15-minute access tokens and 7-day refresh tokens
- Role-based access control (EMPLOYEE, MANAGER, FINANCE, ADMIN)
- All files stored in private Supabase Storage buckets
- Signed URLs expire in 1 hour
- Input validation via class-validator (backend) and Zod (frontend)
- CORS restricted to frontend URL
- Helmet security headers
- Rate limiting (100 requests/minute)
- Password hashing with bcrypt (12 rounds)
- Claims are immutable once submitted (edits require Finance to reopen)

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@wps.ae
FINANCE_EMAIL=finance@wps.ae
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## Future Enhancements

- Microsoft Entra ID SSO (AuthModule is designed to support this via strategy swap)
- HEIC → JPEG conversion on upload
- Push notifications (PWA)
- Multi-currency reporting
- Department budget tracking
- Mobile native app (React Native)
- Automated exchange rate refresh via external API

---

*Built for Würth Professional Solutions LLC — Dubai, UAE*
