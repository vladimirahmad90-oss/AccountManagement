// app/api/reported-accounts/[reportId]/route.ts

import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database-service";

/**
 * --------------------------------------------------------------------------------
 * 🔹 PATCH /api/reported-accounts/[reportId]
 * --------------------------------------------------------------------------------
 * Endpoint untuk menyelesaikan (resolve) sebuah laporan.
 * Bisa juga untuk update password akun yang dilaporkan.
 *
 * @param { params: { reportId: string } } - ID dari laporan yang akan di-resolve
 * @body { newPassword?: string } - (Opsional) Password baru untuk akun terkait.
 * @returns { NextResponse } - Pesan sukses atau pesan error.
 */
export const dynamic = "force-dynamic";
export async function PATCH(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const { reportId } = params;
    const body = await request.json();

    // newPassword bisa 'undefined' atau string kosong, itu valid
    const newPassword = body.newPassword as string | undefined;

    // 1. Validasi input
    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required." },
        { status: 400 } // 400 Bad Request
      );
    }

    console.log(
      `[API] Attempting to resolve report ID: ${reportId} ${
        newPassword ? "with new password" : "without new password"
      }`
    );

    // 2. Panggil DatabaseService
    // Fungsi ini (resolveReport) sudah di-wrap dalam $transaction
    await DatabaseService.resolveReport(reportId, newPassword);

    console.log(`[API] Successfully resolved report ID: ${reportId}`);

    // 3. Kembalikan respons sukses
    return NextResponse.json(
      { message: "Report resolved successfully." },
      { status: 200 } // 200 OK
    );
  } catch (error: any) {
    console.error(
      `❌ [API] PATCH /api/reported-accounts/${params.reportId} error:`,
      error.message
    );

    // Tangani error spesifik jika laporan tidak ditemukan
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 }); // 404 Not Found
    }

    // Error umum
    return NextResponse.json(
      { error: "Failed to resolve report." },
      { status: 500 } // 500 Internal Server Error
    );
  }
}
