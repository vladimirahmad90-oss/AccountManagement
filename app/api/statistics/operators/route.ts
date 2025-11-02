// app/api/statistics/operators/route.ts

import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database-service";

/**
 * --------------------------------------------------------------------------------
 * 🔹 GET /api/statistics/operators
 * --------------------------------------------------------------------------------
 * Endpoint untuk mengambil data statistik aktivitas per operator.
 */
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    console.log("[API] Fetching operator statistics...");

    // Panggil fungsi dari DatabaseService
    const stats = await DatabaseService.getOperatorStatistics();

    console.log(
      "[API] Operator statistics fetched:",
      Object.keys(stats).length,
      "operators"
    );

    // Kembalikan data
    return NextResponse.json(stats, { status: 200 }); // OK
  } catch (error: any) {
    console.error(
      "❌ [API] GET /api/statistics/operators error:",
      error.message
    );
    return NextResponse.json(
      { error: "Failed to fetch operator statistics." },
      { status: 500 } // Internal Server Error
    );
  }
}
