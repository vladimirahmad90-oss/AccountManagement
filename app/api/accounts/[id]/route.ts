// app/api/accounts/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
// Hapus PlatformType dari impor database-service
// import { DatabaseService, AccountType, PlatformType } from "@/lib/database-service";
import { DatabaseService } from "@/lib/database-service"; // Impor service saja
// Impor Prisma untuk error handling dan PlatformType
import { Prisma, PlatformType as PrismaPlatformType } from "@prisma/client";

export const runtime = "nodejs"; // Prisma needs Node.js
export const dynamic = "force-dynamic";

// --- PATCH: Update Akun Berdasarkan ID ---
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = params.id;
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required." },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Terima data dengan tipe dari Prisma
    const {
      email,
      password,
      expiresAt, // Terima string ISO
      platform,
    }: {
      email?: string;
      password?: string;
      expiresAt?: string;
      platform?: PrismaPlatformType; // <-- Gunakan tipe Prisma
    } = body;

    // Bangun objek data untuk service (tipe platform sudah benar)
    const updateData: {
      email?: string;
      password?: string;
      expiresAt?: Date;
      platform?: PrismaPlatformType; // <-- Gunakan tipe Prisma
    } = {};

    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (platform) updateData.platform = platform; // Langsung assign
    if (expiresAt) {
      const expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiresAt date format." },
          { status: 400 }
        );
      }
      updateData.expiresAt = expiresAtDate;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    console.log(`Updating account ${accountId} with data:`, updateData);

    // Panggil DatabaseService.updateAccount
    const updatedAccount = await DatabaseService.updateAccount(
      accountId,
      updateData // Tipe platform sudah sesuai
    );

    if (!updatedAccount) {
      return NextResponse.json(
        { error: `Account with ID ${accountId} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedAccount);
  } catch (error: any) {
    console.error(`Error updating account ${params.id}:`, error);
    if (error.message.includes("already in use")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update account" },
      { status: 500 }
    );
  }
}

// --- DELETE: Hapus Akun Berdasarkan ID ---
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = params.id;
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required." },
        { status: 400 }
      );
    }

    console.log(`Attempting to delete account ${accountId}...`);

    await DatabaseService.deleteAccount(accountId);

    console.log(`Account ${accountId} deleted successfully.`);

    return NextResponse.json(
      { message: `Account ${accountId} deleted successfully.` },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`Error deleting account ${params.id}:`, error);
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to delete account" },
      { status: 500 }
    );
  }
}
