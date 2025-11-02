import { NextResponse, type NextRequest } from "next/server";
import { DatabaseService } from "@/lib/database-service";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

/**
 * Handler PATCH: Meng-update akun WhatsApp
 * Digunakan oleh panel admin.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const id = params.id;
  if (!id) {
    return NextResponse.json(
      { error: "ID Akun WA tidak ada" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { name, number } = body;

    if (!name && !number) {
      return NextResponse.json(
        {
          error: "Tidak ada data (Nama atau Nomor) yang dikirim untuk diupdate",
        },
        { status: 400 }
      );
    }

    const updatedAccount = await DatabaseService.updateWhatsappAccount(id, {
      name,
      number,
    });

    return NextResponse.json(updatedAccount, { status: 200 });
  } catch (e: any) {
    console.error(`Failed to update WhatsApp account ${id}:`, e);
    // Cek jika error karena ID tidak ditemukan
    if (e.code === "P2025") {
      return NextResponse.json(
        { error: "Akun WA tidak ditemukan" },
        { status: 404 } // 404 = Not Found
      );
    }
    // Cek jika error karena nama duplikat (unique constraint)
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "Nama WA tersebut sudah ada (duplikat)" },
        { status: 409 } // 409 = Conflict
      );
    }

    return NextResponse.json(
      { error: `Failed to update WhatsApp account: ${e.message}` },
      { status: 500 }
    );
  }
}

/**
 * Handler DELETE: Menghapus akun WhatsApp
 * Digunakan oleh panel admin.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const id = params.id;
  if (!id) {
    return NextResponse.json(
      { error: "ID Akun WA tidak ada" },
      { status: 400 }
    );
  }

  try {
    const deletedAccount = await DatabaseService.deleteWhatsappAccount(id);
    return NextResponse.json(deletedAccount, { status: 200 });
  } catch (e: any) {
    // <-- PERBAIKAN: Tambahkan {
    console.error(`Failed to delete WhatsApp account ${id}:`, e);
    // Cek jika error karena ID tidak ditemukan
    if (e.code === "P2025") {
      return NextResponse.json(
        { error: "Akun WA tidak ditemukan" },
        { status: 404 } // 404 = Not Found
      );
    }

    return NextResponse.json(
      { error: `Failed to delete WhatsApp account: ${e.message}` },
      { status: 500 }
    );
  } // <-- PERBAIKAN: Tambahkan } penutup catch
}
