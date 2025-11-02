// app/api/reported-accounts/route.ts

import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database-service";

/**
 * --------------------------------------------------------------------------------
 * 🔹 GET /api/reported-accounts
 * --------------------------------------------------------------------------------
 * Endpoint untuk mengambil SEMUA laporan akun.
 */
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    console.log("[API] Fetching all reported accounts...");

    const reports = await DatabaseService.getAllReportedAccounts();

    console.log(`[API] Found ${reports.length} total reports.`);

    return NextResponse.json(reports, { status: 200 }); // 200 OK
  } catch (error: any) {
    console.error("❌ [API] GET /api/reported-accounts error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch reported accounts." },
      { status: 500 } // 500 Internal Server Error
    );
  }
}

/**
 * --------------------------------------------------------------------------------
 * 🔹 POST /api/reported-accounts
 * --------------------------------------------------------------------------------
 * Endpoint untuk membuat laporan akun baru.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // --- PERUBAHAN DI SINI ---
    const { accountId, reason, operatorName } = body; // Ambil operatorName

    if (!accountId || !reason) {
      return NextResponse.json(
        { error: "accountId and reason are required." },
        { status: 400 } // 400 Bad Request
      );
    }

    console.log(`[API] Attempting to report account ID: ${accountId}`);

    // Kirim operatorName ke DatabaseService
    const newReport = await DatabaseService.reportAccount(
      accountId,
      reason,
      operatorName // <-- Kirim ke service
    );
    // --- AKHIR PERUBAHAN ---

    console.log(
      `[API] Successfully reported account ${newReport.accountId}. Report ID: ${newReport.id}`
    );

    return NextResponse.json(newReport, { status: 201 }); // 201 Created
  } catch (error: any) {
    console.error("❌ [API] POST /api/reported-accounts error:", error.message);

    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to report account." },
      { status: 500 }
    );
  }
}
