// app/api/accounts/available/route.ts

import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database-service";
// --- Impor TIPE 'AccountType' dari Prisma ---
import {
  PlatformType as PrismaPlatformType,
  AccountType as PrismaAccountType, // <-- Tambahkan ini
} from "@prisma/client"; // Impor tipe Platform dan AccountType

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * --------------------------------------------------------------------------------
 * 🔹 GET /api/accounts/available?platform=[PLATFORM_TYPE]&type=[ACCOUNT_TYPE]
 * --------------------------------------------------------------------------------
 * Endpoint untuk mendapatkan daftar akun yang masih memiliki profil tersedia
 * berdasarkan platform DAN TIPE akun yang diberikan.
 *
 * @queryParam {PrismaPlatformType} platform - Platform yang dicari (e.g., NETFLIX).
 * @queryParam {PrismaAccountType} type - Tipe akun yang dicari (e.g., sharing).
 * @returns {NextResponse<Account[]>} - Array akun yang tersedia atau error.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform") as PrismaPlatformType | null;
    // --- Baca query parameter 'type' ---
    const type = searchParams.get("type") as PrismaAccountType | null; // <-- Tambahkan ini

    // 1. Validasi query parameter (platform DAN type sekarang wajib)
    if (!platform || !type) {
      // <-- Perbarui validasi
      return NextResponse.json(
        { error: "Query parameters 'platform' AND 'type' are required." }, // <-- Update pesan error
        { status: 400 } // Bad Request
      );
    }

    // Optional: Validasi apakah platform valid
    const validPlatforms = Object.values(PrismaPlatformType);
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform parameter: ${platform}` },
        { status: 400 }
      );
    }

    // --- Tambahkan validasi untuk 'type' ---
    const validTypes = Object.values(PrismaAccountType); // <-- Ambil enum AccountType
    if (!validTypes.includes(type)) {
      // <-- Validasi type
      return NextResponse.json(
        { error: `Invalid type parameter: ${type}` },
        { status: 400 }
      );
    }
    // --- Akhir validasi type ---

    console.log(
      `[API] Request received for available accounts: ${platform} - ${type}` // <-- Update log
    );

    // 2. Panggil DatabaseService dengan KEDUA parameter
    // --- Ganti pemanggilan fungsi ---
    const availableAccounts = await DatabaseService.getAvailableAccounts(
      // <-- Panggil fungsi baru
      platform,
      type // <-- Kirim type
    );
    // --- Akhir penggantian pemanggilan fungsi ---

    console.log(
      `[API] Returning ${availableAccounts.length} available accounts for ${platform} - ${type}.` // <-- Update log
    );

    // 3. Kembalikan hasil
    return NextResponse.json(availableAccounts, { status: 200 }); // OK
  } catch (error: any) {
    console.error(`❌ [API] GET /api/accounts/available error:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch available accounts." },
      { status: 500 } // Internal Server Error
    );
  }
}
