// app/api/garansi-accounts/search/by-expires/route.ts

import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // Ambil query parameter 'date'

    if (!dateParam) {
      return NextResponse.json(
        { error: "Query parameter 'date' is required." },
        { status: 400 }
      );
    }

    const searchDate = new Date(dateParam);
    if (isNaN(searchDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for query parameter 'date'." },
        { status: 400 }
      );
    }

    // Panggil fungsi service yang sudah kita buat
    const accounts = await DatabaseService.getGaransiAccountsByExpiresAt(
      searchDate
    );

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error searching garansi accounts by expires date:", error);
    return NextResponse.json(
      { error: "Failed to search garansi accounts by expires date" },
      { status: 500 }
    );
  }
}
