import { NextResponse, type NextRequest } from "next/server";
import { DatabaseService } from "@/lib/database-service";
export const dynamic = "force-dynamic";
/**
 * Handler GET: Mengambil semua akun WhatsApp
 * Digunakan untuk mengisi dropdown di form request.
 */
export async function GET(request: NextRequest) {
  try {
    const accounts = await DatabaseService.getAllWhatsappAccounts();
    return NextResponse.json(accounts, { status: 200 });
  } catch (e: any) {
    console.error("Failed to fetch WhatsApp accounts:", e);
    return NextResponse.json(
      { error: `Failed to fetch WhatsApp accounts: ${e.message}` },
      { status: 500 }
    );
  }
}

/**
 * Handler POST: Membuat akun WhatsApp baru
 * Digunakan oleh panel admin.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, number } = body;

    if (!name || !number) {
      return NextResponse.json(
        { error: "Nama dan Nomor WA wajib diisi" },
        { status: 400 }
      );
    }

    const newAccount = await DatabaseService.createWhatsappAccount({
      name,
      number,
    });

    return NextResponse.json(newAccount, { status: 201 }); // 201 = Created
  } catch (e: any) {
    console.error("Failed to create WhatsApp account:", e);
    // Cek jika error karena nama duplikat (unique constraint)
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "Nama WA tersebut sudah ada (duplikat)" },
        { status: 409 } // 409 = Conflict
      );
    }

    return NextResponse.json(
      { error: `Failed to create WhatsApp account: ${e.message}` },
      { status: 500 }
    );
  }
}
