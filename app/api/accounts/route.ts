// app/api/accounts/route.ts

import { NextRequest, NextResponse } from "next/server";
// Hapus PlatformType dari impor database-service
// import { DatabaseService, AccountType, PlatformType } from "@/lib/database-service";
import { DatabaseService, AccountType } from "@/lib/database-service"; // Impor service & AccountType
// Impor PlatformType dari Prisma
import { PlatformType as PrismaPlatformType } from "@prisma/client";

export const runtime = "nodejs"; // Prisma needs Node.js
export const dynamic = "force-dynamic";

// --- GET: Ambil Akun (dengan filter opsional) ---
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get("type") as AccountType | null;

    let accounts;
    if (accountType && ["private", "sharing", "vip"].includes(accountType)) {
      console.log(`Fetching accounts with type: ${accountType}`);
      accounts = await DatabaseService.getAccountsByType(accountType);
    } else {
      console.log("Fetching all accounts (no valid type filter)");
      accounts = await DatabaseService.getAllAccounts();
    }

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error fetching main accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch main accounts" },
      { status: 500 }
    );
  }
}

// --- POST: Tambah Akun Baru ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Terima data dengan tipe dari Prisma
    const {
      email,
      password,
      type,
      platform,
      expiresAt, // string ISO date
    }: {
      email: string;
      password: string;
      type: AccountType; // Tipe lokal 'private'|'sharing'|'vip'
      platform: PrismaPlatformType; // <-- Gunakan tipe Prisma
      expiresAt?: string;
    } = body;

    // Validasi input
    if (!email || !password || !type || !platform) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: email, password, type, platform are required.",
        },
        { status: 400 }
      );
    }
    if (!["private", "sharing", "vip"].includes(type)) {
      return NextResponse.json(
        { error: `Invalid account type: ${type}` },
        { status: 400 }
      );
    }
    // TODO: Add platform validation if needed

    const expiresAtDate = expiresAt ? new Date(expiresAt) : undefined;
    if (expiresAtDate && isNaN(expiresAtDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid expiresAt date format." },
        { status: 400 }
      );
    }

    // Panggil DatabaseService.addAccount
    // Tipe platform sudah sesuai
    const newAccount = await DatabaseService.addAccount({
      email,
      password,
      type,
      platform, // Kirim tipe Prisma
      expiresAt: expiresAtDate,
    });

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error: any) {
    console.error("Error adding main account:", error);
    if (error.message.includes("already exists")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to add main account" },
      { status: 500 }
    );
  }
}
