// app/api/garansi-accounts/route.ts

import { NextRequest, NextResponse } from "next/server";
// Hapus PlatformType dari impor database-service
// import { DatabaseService, AccountType, PlatformType } from '@/lib/database-service';
import { DatabaseService, AccountType } from "@/lib/database-service"; // Impor service & AccountType
// Impor PlatformType dari Prisma
import { PlatformType as PrismaPlatformType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tipe data input untuk satu akun garansi (gunakan tipe Prisma)
interface GaransiAccountInput {
  email: string;
  password: string;
  type: AccountType; // Tipe lokal 'private'|'sharing'|'vip'
  platform: PrismaPlatformType; // <-- Gunakan tipe Prisma
}

// Tipe payload utama
interface GaransiBulkPayload {
  accounts: GaransiAccountInput[];
  expiresAt: string; // Terima string ISO
}

// --- GET: Ambil Akun Garansi (dengan filter tanggal opsional) ---
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateQuery = searchParams.get("date"); // date untuk warrantyDate
    const expiresQuery = searchParams.get("expires"); // expires untuk expiresAt

    let garansiAccounts;

    if (dateQuery) {
      const searchDate = new Date(dateQuery);
      if (isNaN(searchDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format for 'date' query." },
          { status: 400 }
        );
      }
      console.log(
        `Fetching garansi accounts by warranty date: ${searchDate.toISOString()}`
      );
      garansiAccounts = await DatabaseService.getGaransiAccountsByDate(
        searchDate
      );
    } else if (expiresQuery) {
      const searchExpires = new Date(expiresQuery);
      if (isNaN(searchExpires.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format for 'expires' query." },
          { status: 400 }
        );
      }
      console.log(
        `Fetching garansi accounts by expires date: ${searchExpires.toISOString()}`
      );
      garansiAccounts = await DatabaseService.getGaransiAccountsByExpiresAt(
        searchExpires
      );
    } else {
      console.log("Fetching all garansi accounts");
      garansiAccounts = await DatabaseService.getAllGaransiAccounts();
    }

    return NextResponse.json(garansiAccounts);
  } catch (error) {
    console.error("Error fetching garansi accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch garansi accounts" },
      { status: 500 }
    );
  }
}

// --- POST: Tambah Akun Garansi Baru (Bulk) ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Gunakan tipe payload yang sudah diperbarui
    const { accounts, expiresAt }: GaransiBulkPayload = body;

    // Validasi input
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json(
        { error: "Input 'accounts' harus array dan tidak kosong." },
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
        { error: "Format 'expiresAt' tidak valid." },
        { status: 400 }
      );
    }

    // Validasi tiap item (gunakan tipe GaransiAccountInput)
    for (const acc of accounts) {
      if (!acc.email || !acc.password || !acc.type || !acc.platform) {
        return NextResponse.json(
          { error: `Data akun garansi tidak lengkap: ${JSON.stringify(acc)}` },
          { status: 400 }
        );
      }
      if (!["private", "sharing", "vip"].includes(acc.type)) {
        return NextResponse.json(
          { error: `Tipe akun garansi tidak valid: ${acc.type}` },
          { status: 400 }
        );
      }
      // TODO: Add platform validation if needed
    }

    console.log(
      `Attempting bulk garansi import for ${
        accounts.length
      } accounts, expires: ${expiresAtDate.toISOString()}`
    );

    // Panggil DatabaseService.addGaransiAccounts
    // Tipe data 'accounts' sudah sesuai karena service mengharapkan tipe Prisma
    const createdGaransiAccounts = await DatabaseService.addGaransiAccounts(
      accounts, // Kirim array GaransiAccountInput
      expiresAtDate // Kirim sebagai Date object
    );

    // service.addGaransiAccounts mengembalikan array akun yang relevan
    const successCount = Array.isArray(createdGaransiAccounts)
      ? createdGaransiAccounts.length
      : 0;
    console.log(
      `Successfully processed/retrieved ${successCount} garansi accounts.`
    );

    return NextResponse.json(
      {
        message: `Bulk garansi import processed. ${successCount} accounts retrieved.`,
        // Kembalikan akun yang baru dibuat (opsional)
        // createdAccounts: createdGaransiAccounts
      },
      { status: 201 } // 201 Created
    );
  } catch (error: any) {
    console.error("Error adding garansi accounts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add garansi accounts" },
      { status: 500 }
    );
  }
}
