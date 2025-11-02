// app/api/garansi-accounts/search/by-date/route.ts

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

    // Panggil fungsi service yang sesuai (pastikan ada di DatabaseService)
    const accounts = await DatabaseService.getGaransiAccountsByDate(searchDate); // Anda mungkin perlu membuat fungsi ini jika belum ada

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error searching garansi accounts by date:", error);
    return NextResponse.json(
      { error: "Failed to search garansi accounts by date" },
      { status: 500 }
    );
  }
}

// Catatan: Pastikan DatabaseService memiliki fungsi getGaransiAccountsByDate(date: Date)
// Contoh implementasinya di DatabaseService:
/*
static async getGaransiAccountsByDate(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.garansiAccount.findMany({
      where: {
        warrantyDate: { // atau createdAt jika Anda menggunakan itu
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: "desc" }, // atau warrantyDate
    });
}
*/
