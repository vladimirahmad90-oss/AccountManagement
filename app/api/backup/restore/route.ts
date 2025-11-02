// app/api/backup/restore/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Impor prisma client
import { Prisma } from "@prisma/client"; // Impor Prisma untuk tipe dan error

// Impor tipe data backup jika ada (atau definisikan di sini)
interface BackupDataPayload {
  accounts: any[];
  customerAssignments: any[];
  reportedAccounts: any[];
  users: any[];
}

export const dynamic = "force-dynamic";
/**
 * --------------------------------------------------------------------------------
 * 🔹 POST /api/backup/restore
 * --------------------------------------------------------------------------------
 * Endpoint untuk me-restore data dari file backup JSON.
 * !!! PERHATIAN: Operasi ini akan MENGHAPUS data lama sebelum import !!!
 * TODO: Tambahkan otentikasi/otorisasi (hanya admin).
 */
export async function POST(request: Request) {
  console.log("[API] Received restore request...");

  // TODO: Implementasikan cek otentikasi di sini!
  // Misalnya, verifikasi token JWT dari header Authorization
  // Jika tidak valid/bukan admin, return error 401/403

  try {
    const body: BackupDataPayload = await request.json();

    // 1. Validasi data dasar
    if (
      !body ||
      !Array.isArray(body.accounts) ||
      !Array.isArray(body.customerAssignments) ||
      !Array.isArray(body.reportedAccounts) ||
      !Array.isArray(body.users)
    ) {
      return NextResponse.json(
        { error: "Invalid backup data format." },
        { status: 400 }
      );
    }

    console.log(
      `[API] Starting restore transaction. Backup contains: ${body.accounts.length} accounts, ${body.customerAssignments.length} assignments, ${body.reportedAccounts.length} reports, ${body.users.length} users.`
    );

    // 2. Jalankan operasi dalam transaksi database
    await prisma.$transaction(async (tx) => {
      console.log("[API] Deleting existing data...");

      // Hapus data lama (Urutan penting jika ada foreign key non-cascade)
      // Hapus relasi dulu
      await tx.reportedAccount.deleteMany({});
      await tx.customerAssignment.deleteMany({});
      // Baru hapus data utama (kecuali admin utama mungkin?)
      await tx.account.deleteMany({});
      // Hati-hati menghapus user, mungkin sisakan admin utama
      // Contoh: await tx.user.deleteMany({ where: { username: { not: 'admin' } } });
      await tx.user.deleteMany({}); // Menghapus semua user untuk contoh ini

      console.log("[API] Inserting data from backup...");

      // Masukkan data baru
      // Perlu konversi tipe data jika perlu (misal: String ke Date, JSON)

      // Insert Users
      if (body.users.length > 0) {
        await tx.user.createMany({
          data: body.users.map((user) => ({
            id: user.id, // Pastikan ID diikutsertakan jika ada di backup
            username: user.username,
            password: user.password, // Ingat, masih plaintext
            role: user.role,
            name: user.name,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(), // Konversi ke Date
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(), // Konversi ke Date
          })),
          skipDuplicates: true, // Lewati jika username sudah ada (misal admin tidak terhapus)
        });
        console.log(`[API] Inserted ${body.users.length} users.`);
      }

      // Insert Accounts
      if (body.accounts.length > 0) {
        await tx.account.createMany({
          data: body.accounts.map((acc) => ({
            id: acc.id,
            email: acc.email,
            password: acc.password,
            type: acc.type,
            platform: acc.platform,
            // profiles perlu ditangani khusus karena JSON
            profiles:
              typeof acc.profiles === "string"
                ? JSON.parse(acc.profiles) // Parse jika string
                : (acc.profiles as Prisma.InputJsonValue), // Gunakan langsung jika sudah objek/array
            createdAt: acc.createdAt ? new Date(acc.createdAt) : new Date(),
            expiresAt: acc.expiresAt
              ? new Date(acc.expiresAt)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            reported: acc.reported ?? false,
          })),
          skipDuplicates: true, // Lewati jika email sudah ada
        });
        console.log(`[API] Inserted ${body.accounts.length} accounts.`);
      }

      // Insert Customer Assignments (Pastikan Account ID valid setelah insert accounts)
      // NOTE: createMany tidak mengembalikan ID, jadi referensi ID mungkin bermasalah
      //       jika ID di backup berbeda. Cara lebih aman: loop dan create satu per satu.
      //       Tapi untuk kecepatan, kita coba createMany dulu.
      if (body.customerAssignments.length > 0) {
        try {
          await tx.customerAssignment.createMany({
            data: body.customerAssignments.map((assign) => ({
              id: assign.id,
              customerIdentifier: assign.customerIdentifier,
              accountId: assign.accountId, // Asumsi ID ini ada di data accounts backup
              accountEmail: assign.accountEmail,
              accountType: assign.accountType,
              profileName: assign.profileName,
              operatorName: assign.operatorName,
              assignedAt: assign.assignedAt
                ? new Date(assign.assignedAt)
                : new Date(),
            })),
            skipDuplicates: true,
          });
          console.log(
            `[API] Inserted ${body.customerAssignments.length} assignments.`
          );
        } catch (e: any) {
          // Tangani jika foreign key constraint gagal (accountId tidak ditemukan)
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2003"
          ) {
            console.error(
              "[API] Foreign key constraint failed during assignment import. Account ID might be missing from backup accounts.",
              e.meta
            );
            throw new Error(
              "Gagal mengimpor assignment: Account ID tidak ditemukan. Pastikan data akun di backup lengkap."
            );
          }
          throw e; // Lempar error lain
        }
      }

      // Insert Reported Accounts (Sama seperti assignment, perlu Account ID valid)
      if (body.reportedAccounts.length > 0) {
        try {
          await tx.reportedAccount.createMany({
            data: body.reportedAccounts.map((report) => ({
              id: report.id,
              accountId: report.accountId, // Asumsi ID ini ada
              reportReason: report.reportReason,
              reportedAt: report.reportedAt
                ? new Date(report.reportedAt)
                : new Date(),
              resolved: report.resolved ?? false,
              operatorName: report.operatorName,
            })),
            skipDuplicates: true,
          });
          console.log(
            `[API] Inserted ${body.reportedAccounts.length} reports.`
          );
        } catch (e: any) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2003"
          ) {
            console.error(
              "[API] Foreign key constraint failed during report import. Account ID might be missing.",
              e.meta
            );
            throw new Error(
              "Gagal mengimpor report: Account ID tidak ditemukan."
            );
          }
          throw e;
        }
      }

      console.log("[API] Restore transaction committed successfully.");
    }); // Akhir transaksi

    // 3. Kembalikan respons sukses
    return NextResponse.json(
      { message: "Data restored successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [API] POST /api/backup/restore error:", error);
    // Kembalikan pesan error yang lebih spesifik jika memungkinkan
    return NextResponse.json(
      { error: `Failed to restore data: ${error.message}` },
      { status: 500 }
    );
  }
}
