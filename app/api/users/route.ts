// app/api/users/route.ts (FILE BARU)

import { NextRequest, NextResponse } from "next/server";
import {
  getAllUsers,
  addUser,
  updateUserPassword,
  deleteUser,
} from "@/lib/auth-server";

export const dynamic = "force-dynamic";
// ============================================================
// 1. GET (Ambil semua user)
// ============================================================
export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data user" },
      { status: 500 }
    );
  }
}

// ============================================================
// 2. POST (Tambah user baru)
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { username, password, role, name } = await req.json();

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: "Username, password, dan role harus diisi" },
        { status: 400 }
      );
    }

    const success = await addUser({
      username,
      password,
      role,
      name: name || null,
    });

    if (success) {
      return NextResponse.json(
        { message: "User berhasil ditambahkan" },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: "Gagal menambahkan user" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}

// ============================================================
// 3. PATCH (Update password)
// ============================================================
export async function PATCH(req: NextRequest) {
  try {
    const { username, newPassword } = await req.json();

    if (!username || !newPassword) {
      return NextResponse.json(
        { error: "Username dan password baru harus diisi" },
        { status: 400 }
      );
    }

    const success = await updateUserPassword(username, newPassword);

    if (success) {
      return NextResponse.json({ message: "Password berhasil diubah" });
    } else {
      return NextResponse.json(
        { error: "Gagal mengubah password" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}

// ============================================================
// 4. DELETE (Hapus user)
// ============================================================
export async function DELETE(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username harus diisi" },
        { status: 400 }
      );
    }

    // Fungsi 'deleteUser' sudah punya proteksi anti-hapus 'admin'
    const success = await deleteUser(username);

    if (success) {
      return NextResponse.json({ message: "User berhasil dihapus" });
    } else {
      return NextResponse.json(
        { error: "Gagal menghapus user (mungkin admin?)" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}
