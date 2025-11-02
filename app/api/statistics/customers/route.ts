// app/api/statistics/customers/route.ts

import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database-service";

/**
 * --------------------------------------------------------------------------------
 * 🔹 GET /api/statistics/customers
 * --------------------------------------------------------------------------------
 * Endpoint untuk mengambil data statistik customer (total, per tipe, dll).
 */
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    console.log("[API] Fetching customer statistics...");

    // Panggil fungsi dari DatabaseService
    const stats = await DatabaseService.getCustomerStatistics();

    console.log("[API] Customer statistics fetched:", stats);

    // Kembalikan data
    return NextResponse.json(stats, { status: 200 }); // OK
  } catch (error: any) {
    console.error(
      "❌ [API] GET /api/statistics/customers error:",
      error.message
    );
    return NextResponse.json(
      { error: "Failed to fetch customer statistics." },
      { status: 500 } // Internal Server Error
    );
  }
}
