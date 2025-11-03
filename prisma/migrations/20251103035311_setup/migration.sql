-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('sharing', 'private', 'vip');

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('VIDIO_DIAMOND_MOBILE', 'VIU_1_BULAN', 'WE_TV', 'YOUTUBE_1_BULAN', 'HBO', 'LOKLOK', 'PRIMEVIDEO', 'SPOTIFY_FAMPLAN_1_BULAN', 'SPOTIFY_FAMPLAN_2_BULAN', 'VIDIO_PLATINUM', 'CANVA_1_BULAN', 'CANVA_1_TAHUN', 'CHAT_GPT', 'DISNEY', 'NETFLIX', 'CAPCUT');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "profiles" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "reported" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garansi_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "warranty_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "garansi_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reported_accounts" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "report_reason" TEXT NOT NULL,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "operator_name" TEXT,

    CONSTRAINT "reported_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_assignments" (
    "id" TEXT NOT NULL,
    "customer_identifier" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "account_email" TEXT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "profile_name" TEXT NOT NULL,
    "operator_name" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "whatsapp_account_id" TEXT,

    CONSTRAINT "customer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_activities" (
    "id" TEXT NOT NULL,
    "operator_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "account_email" TEXT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_accounts_name_key" ON "whatsapp_accounts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "reported_accounts" ADD CONSTRAINT "reported_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_assignments" ADD CONSTRAINT "customer_assignments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_assignments" ADD CONSTRAINT "customer_assignments_whatsapp_account_id_fkey" FOREIGN KEY ("whatsapp_account_id") REFERENCES "whatsapp_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
