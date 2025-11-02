// app/api/login/route.ts (DIPERBARUI DENGAN JWT)

import { NextRequest, NextResponse } from "next/server";
import { validateUser } from "@/lib/auth-server";
import jwt from "jsonwebtoken"; // <-- 1. Impor JWT

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 2. Ambil Kunci Rahasia dari .env
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error(
        "JWT_SECRET tidak disetel di .env. Server tidak bisa start."
      );
      throw new Error("Konfigurasi server error");
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password diperlukan" },
        { status: 400 }
      );
    }

    // Panggil fungsi server-side di sini
    const user = await validateUser(username, password);

    if (user) {
      // 3. ✅ PERBAIKAN: Buat Token
      // 'user' (ClientUser) adalah data yang akan kita simpan di dalam token
      const token = jwt.sign(user, jwtSecret, {
        expiresIn: "1d", // Token akan kedaluwarsa dalam 1 hari
      });

      // 4. ✅ PERBAIKAN: Kembalikan DATA USER dan TOKEN
      return NextResponse.json({ user: user, token: token }, { status: 200 });
    } else {
      // Kirim error jika gagal
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
