-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'MANAGER', 'FINANCE', 'ADMIN');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'MANAGER_APPROVED', 'FINANCE_APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('MANAGER_APPROVED', 'MANAGER_REJECTED', 'FINANCE_APPROVED', 'FINANCE_REJECTED', 'MARKED_PAID', 'REOPENED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "account_no" TEXT,
    "iban" TEXT,
    "swift" TEXT,
    "bank_name" TEXT,
    "department" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "claim_number" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_name" TEXT,
    "purpose" TEXT,
    "department" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "total_aed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_eur" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_items" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "line_order" INTEGER NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "category_code" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "pl_cost_type_nr" TEXT,
    "pl_cost_type_name" TEXT,
    "pillar_name" TEXT,
    "description" TEXT NOT NULL,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "original_amount" DECIMAL(12,2) NOT NULL,
    "exchange_rate_used" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "aed_amount" DECIMAL(12,2) NOT NULL,
    "eur_amount" DECIMAL(12,2) NOT NULL,
    "receipt_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claim_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT,
    "claim_item_id" TEXT,
    "uploaded_by_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "is_compressed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL DEFAULT 'AED',
    "target_currency" TEXT NOT NULL,
    "rate" DECIMAL(10,6) NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "claim_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claim_number_key" ON "claims"("claim_number");

-- CreateIndex
CREATE INDEX "claims_user_id_idx" ON "claims"("user_id");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "claims_created_at_idx" ON "claims"("created_at");

-- CreateIndex
CREATE INDEX "claim_items_claim_id_idx" ON "claim_items"("claim_id");

-- CreateIndex
CREATE INDEX "attachments_claim_id_idx" ON "attachments"("claim_id");

-- CreateIndex
CREATE INDEX "attachments_claim_item_id_idx" ON "attachments"("claim_item_id");

-- CreateIndex
CREATE INDEX "exchange_rates_target_currency_effective_date_idx" ON "exchange_rates"("target_currency", "effective_date");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_base_currency_target_currency_effective_date_key" ON "exchange_rates"("base_currency", "target_currency", "effective_date");

-- CreateIndex
CREATE INDEX "approvals_claim_id_idx" ON "approvals"("claim_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_claim_id_idx" ON "audit_logs"("claim_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_items" ADD CONSTRAINT "claim_items_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_claim_item_id_fkey" FOREIGN KEY ("claim_item_id") REFERENCES "claim_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
