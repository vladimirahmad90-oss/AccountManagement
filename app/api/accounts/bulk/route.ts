// app/api/accounts/bulk/route.ts

import { NextRequest, NextResponse } from "next/server";
// Hapus PlatformType dari impor database-service
// import { DatabaseService, AccountType, PlatformType } from "@/lib/database-service";
import { DatabaseService, AccountType } from "@/lib/database-service"; // Impor service & AccountType
// Impor Prisma untuk error handling dan PlatformType
import { Prisma, PlatformType as PrismaPlatformType } from "@prisma/client";

export const runtime = "nodejs"; // Prisma needs Node.js
export const dynamic = "force-dynamic";

// Tipe data yang diharapkan dari body request (gunakan tipe Prisma)
interface AccountInput {
  email: string;
  password: string;
  type: AccountType; // Tipe AccountType lokal ('private' | 'sharing' | 'vip')
  platform: PrismaPlatformType; // <-- Gunakan tipe Prisma
}
interface BulkImportPayload {
  accounts: AccountInput[];
  expiresAt: string; // Terima sebagai string ISO date
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Gunakan tipe yang sudah diperbarui
    const { accounts, expiresAt }: BulkImportPayload = body;

    // --- Validasi Input ---
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json(
        {
          error: "Input 'accounts' harus berupa array dan tidak boleh kosong.",
        },
        { status: 400 }
      );
    }
    if (!expiresAt) {
      return NextResponse.json(
        { error: "Input 'expiresAt' diperlukan." },
        { status: 400 }
      );
    }

    const expiresAtDate = new Date(expiresAt);
    if (isNaN(expiresAtDate.getTime())) {
      return NextResponse.json(
        {
          error:
            "Format 'expiresAt' tidak valid. Gunakan format ISO date string.",
        },
        { status: 400 }
      );
    }

    // Validasi setiap item (gunakan tipe AccountInput)
    for (const acc of accounts) {
      if (!acc.email || !acc.password || !acc.type || !acc.platform) {
        return NextResponse.json(
          {
            error: `Data akun tidak lengkap ditemukan: ${JSON.stringify(acc)}`,
          },
          { status: 400 }
        );
      }
      if (!["private", "sharing", "vip"].includes(acc.type)) {
        return NextResponse.json(
          { error: `Tipe akun tidak valid: ${acc.type}` },
          { status: 400 }
        );
      }
      // TODO: Tambahkan validasi platform jika enum Prisma tidak cukup
      // Misalnya cek apakah acc.platform ada di Object.values(PrismaPlatformType)
    }
    // --- Akhir Validasi Input ---

    console.log(
      `Attempting bulk import for ${
        accounts.length
      } accounts with expiry ${expiresAtDate.toISOString()}`
    );

    // Panggil DatabaseService.addMultipleAccounts
    // Tipe data 'accounts' sudah sesuai karena service mengharapkan tipe Prisma
    const createdAccounts = await DatabaseService.addMultipleAccounts(
      accounts, // Kirim array AccountInput
      expiresAtDate // Kirim sebagai Date object
    );

    const successCount = createdAccounts.length;
    console.log(
      `Successfully processed/retrieved ${successCount} accounts after bulk operation.`
    );

    return NextResponse.json(
      {
        message: `Bulk import processed. ${successCount} accounts relevant to this batch were retrieved.`,
        processedCount: successCount,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error during bulk account import:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process bulk import" },
      { status: 500 }
    );
  }
}
