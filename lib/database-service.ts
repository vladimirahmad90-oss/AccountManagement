// lib/database-service.ts

import { prisma } from "./prisma";
import {
  Prisma,
  Account,
  AccountType as PrismaAccountType,
  PlatformType as PrismaPlatformType, // Kita gunakan ini
  WhatsappAccount, // <-- TAMBAHKAN TIPE INI
} from "@prisma/client";
// Impor generateProfiles dari utils
import { generateProfiles } from "./utils";

// Tipe Profile lokal (definisi ini penting karena database.types.ts dihapus)
interface Profile {
  profile: string;
  pin: string;
  used: boolean;
}

// Tipe AccountType lokal (masih dipakai sebagai string literal)
export type AccountType = "private" | "sharing" | "vip";

// Definisi PlatformType manual SUDAH DIHAPUS
// Helper generateProfiles lokal SUDAH DIHAPUS

export class DatabaseService {
  // ===========================
  // 隼 ACCOUNT CRUD
  // ===========================

  static async getAllAccounts(): Promise<Account[]> {
    return prisma.account.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  static async getAccountsByType(type: AccountType): Promise<Account[]> {
    if (!["private", "sharing", "vip"].includes(type)) {
      console.warn(`Invalid account type requested: ${type}`);
      return [];
    }
    return prisma.account.findMany({
      where: { type: type as PrismaAccountType },
      orderBy: { createdAt: "desc" },
    });
  }

  // Gunakan PrismaPlatformType
  static async getAccountsByPlatform(
    platform: PrismaPlatformType
  ): Promise<Account[]> {
    return prisma.account.findMany({
      where: { platform: platform },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getAccountByEmail(email: string): Promise<Account | null> {
    if (!email || typeof email !== "string") return null;
    return prisma.account.findUnique({ where: { email } });
  }

  static async searchAccountsByEmail(emailQuery: string): Promise<Account[]> {
    const trimmedQuery = emailQuery?.trim();
    if (!trimmedQuery) return [];
    return prisma.account.findMany({
      where: {
        email: { contains: trimmedQuery, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  // Fungsi dengan perbaikan JSON
  static async getAvailableProfileCount(type: AccountType): Promise<number> {
    const accountsOfType = await this.getAccountsByType(type);
    let availableCount = 0;
    accountsOfType.forEach((account) => {
      if (account.profiles) {
        try {
          let profilesArray: unknown;
          if (typeof account.profiles === "string") {
            // Tambah cek string kosong
            if (account.profiles.trim() === "") {
              profilesArray = [];
            } else {
              profilesArray = JSON.parse(account.profiles);
            }
          } else {
            profilesArray = account.profiles;
          }

          if (Array.isArray(profilesArray)) {
            // Gunakan double assertion & type guard
            availableCount += (profilesArray as unknown as Profile[]).filter(
              // Gunakan p: any agar properti bisa diakses
              (p: any): p is Profile =>
                typeof p === "object" &&
                p !== null &&
                typeof p.profile === "string" &&
                typeof p.pin === "string" &&
                typeof p.used === "boolean" &&
                p.used === false // Filter yang belum terpakai
            ).length;
          } else {
            console.warn(
              `Profiles data for account ${account.id} is not an array:`,
              profilesArray
            );
          }
        } catch (e) {
          console.error(
            `Failed to parse/process profiles for account ${account.id}:`,
            account.profiles,
            e
          );
        }
      }
    });
    return availableCount;
  }

  // --- PERBAIKAN #4 ---
  // Fungsi diubah untuk mencari akun tersedia by platform DAN TIPE
  // (Menggantikan getAvailableAccountsByPlatform)
  static async getAvailableAccounts(
    platform: PrismaPlatformType,
    type: PrismaAccountType // <-- TAMBAH argumen 'type'
  ): Promise<Account[]> {
    console.log(
      `[Service] Searching available accounts for platform: ${platform} AND type: ${type}`
    );
    const accounts = await prisma.account.findMany({
      where: {
        platform: platform,
        type: type, // <-- TAMBAHKAN FILTER TYPE DI SINI
      },
      orderBy: { createdAt: "asc" }, // Prioritaskan akun lama
    });
    console.log(
      `[Service] Found ${accounts.length} accounts total for ${platform} & ${type}. Filtering available...`
    );
    const availableAccounts = accounts.filter((account) => {
      if (!account.profiles) return false;
      try {
        let profilesArray: unknown;
        if (typeof account.profiles === "string") {
          if (account.profiles.trim() === "") return false; // String kosong = tidak ada profil
          profilesArray = JSON.parse(account.profiles);
        } else {
          profilesArray = account.profiles;
        }
        if (Array.isArray(profilesArray)) {
          // Gunakan p: any di .some()
          return (profilesArray as unknown as Profile[]).some(
            (p: any): p is Profile =>
              typeof p === "object" &&
              p !== null &&
              typeof p.used === "boolean" &&
              p.used === false // Cek apakah ada yg false
          );
        }
        return false; // Bukan array valid
      } catch (e) {
        console.error(
          `[Service] Error parsing profiles for account ${account.id} during availability check:`,
          e
        );
        return false;
      }
    });
    console.log(
      `[Service] Found ${availableAccounts.length} available accounts for ${platform} & ${type}.`
    );
    return availableAccounts;
  }
  // --- AKHIR PERBAIKAN #4 ---

  static async isCustomerIdentifierUsed(
    customerIdentifier: string
  ): Promise<boolean> {
    if (!customerIdentifier) return false;
    const assignment = await prisma.customerAssignment.findFirst({
      where: { customerIdentifier: customerIdentifier },
      select: { id: true },
    });
    return !!assignment;
  }

  static async addAccount(data: {
    email: string;
    password: string;
    type: AccountType;
    platform: PrismaPlatformType;
    expiresAt?: Date;
  }): Promise<Account> {
    if (!data.email || !data.password || !data.type || !data.platform) {
      throw new Error("Email, password, type, and platform are required.");
    }
    if (!["private", "sharing", "vip"].includes(data.type)) {
      throw new Error(`Invalid account type: ${data.type}`);
    }
    const existingAccount = await this.getAccountByEmail(data.email);
    if (existingAccount) {
      throw new Error(`Account with email ${data.email} already exists.`);
    }
    try {
      return await prisma.account.create({
        data: {
          email: data.email,
          password: data.password, // Ingat: plaintext
          type: data.type as PrismaAccountType,
          platform: data.platform,
          profiles: generateProfiles(
            data.type as PrismaAccountType
          ) as unknown as Prisma.InputJsonValue,
          expiresAt:
            data.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          reported: false,
        },
      });
    } catch (error: any) {
      console.error("Error creating account:", error);
      throw new Error(`Failed to create account ${data.email}.`);
    }
  }

  static async addMultipleAccounts(
    accounts: {
      email: string;
      password: string;
      type: AccountType;
      platform: PrismaPlatformType;
    }[],
    expiresAt?: Date
  ): Promise<Account[]> {
    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error("Accounts array cannot be empty.");
    }
    const defaultExpiresAt =
      expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const dataToInsert = accounts.map((a) => {
      if (!a.email || !a.password || !a.type || !a.platform) {
        throw new Error(`Invalid account data in array: ${JSON.stringify(a)}`);
      }
      if (!["private", "sharing", "vip"].includes(a.type)) {
        throw new Error(`Invalid account type in array: ${a.type}`);
      }
      return {
        email: a.email,
        password: a.password,
        type: a.type as PrismaAccountType,
        platform: a.platform,
        profiles: generateProfiles(
          a.type as PrismaAccountType
        ) as unknown as Prisma.InputJsonValue,
        expiresAt: defaultExpiresAt,
        reported: false,
      };
    });
    try {
      const result = await prisma.account.createMany({
        data: dataToInsert,
        skipDuplicates: true,
      });
      console.log(
        `Attempted to insert ${accounts.length} accounts, ${result.count} were new.`
      );
      return await prisma.account.findMany({
        where: { email: { in: accounts.map((x) => x.email) } },
        orderBy: { createdAt: "desc" },
      });
    } catch (error: any) {
      console.error("Error during bulk account insert:", error);
      throw new Error("Failed to add multiple accounts.");
    }
  }

  static async updateAccount(
    id: string,
    data: {
      email?: string;
      password?: string;
      expiresAt?: Date;
      profiles?: Profile[]; // Gunakan tipe Profile lokal
      platform?: PrismaPlatformType;
    }
  ): Promise<Account | null> {
    if (!id) throw new Error("Account ID is required for update.");
    const payload: Prisma.AccountUpdateInput = {};
    if (data.email) payload.email = data.email;
    if (data.password) payload.password = data.password;
    if (data.expiresAt) payload.expiresAt = data.expiresAt;
    if (data.platform) payload.platform = data.platform;
    if (data.profiles && Array.isArray(data.profiles)) {
      payload.profiles = data.profiles as unknown as Prisma.InputJsonValue;
    } else if (data.profiles) {
      console.warn(
        `Invalid profiles data received for update on account ${id}:`,
        data.profiles
      );
    }
    if (Object.keys(payload).length === 0) {
      console.warn(`No valid data provided to update account ${id}.`);
      return prisma.account.findUnique({ where: { id } });
    }
    try {
      return await prisma.account.update({ where: { id }, data: payload });
    } catch (error: any) {
      console.error(`Error updating account ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (
          error.code === "P2002" &&
          error.meta?.target === "accounts_email_key"
        ) {
          throw new Error(
            `Failed to update account: Email '${data.email}' is already in use.`
          );
        } else if (error.code === "P2025") {
          throw new Error(`Account with ID ${id} not found.`);
        }
      }
      throw new Error(`Failed to update account ${id}.`);
    }
  }

  static async deleteAccount(id: string): Promise<Account> {
    if (!id) throw new Error("Account ID is required for deletion.");
    try {
      return await prisma.$transaction(async (tx) => {
        console.log(`Deleting relations for account ${id}...`);
        await tx.customerAssignment.deleteMany({ where: { accountId: id } });
        await tx.reportedAccount.deleteMany({ where: { accountId: id } });
        console.log(`Deleting account ${id}...`);
        const deletedAccount = await tx.account.delete({ where: { id } });
        console.log(
          `Account ${id} (${deletedAccount.email}) deleted successfully.`
        );
        return deletedAccount;
      });
    } catch (error: any) {
      console.error(`Error deleting account ${id}:`, error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new Error(`Account with ID ${id} not found.`);
      }
      throw new Error(`Failed to delete account ${id}.`);
    }
  }

  // ===========================
  // 隼 GARANSI ACCOUNTS
  // ===========================
  static async addGaransiAccounts(
    accounts: {
      email: string;
      password: string;
      type: AccountType;
      platform: PrismaPlatformType;
    }[],
    expiresAt: Date
  ) {
    if (!Array.isArray(accounts) || accounts.length === 0)
      throw new Error("Garansi accounts array cannot be empty.");
    if (
      !expiresAt ||
      !(expiresAt instanceof Date) ||
      isNaN(expiresAt.getTime())
    )
      throw new Error("Invalid or missing expiresAt date.");
    const now = new Date();
    const dataToInsert = accounts.map((a) => {
      if (!a.email || !a.password || !a.type || !a.platform)
        throw new Error(`Invalid garansi data: ${JSON.stringify(a)}`);
      if (!["private", "sharing", "vip"].includes(a.type))
        throw new Error(`Invalid type: ${a.type}`);
      return {
        email: a.email,
        password: a.password,
        type: a.type as PrismaAccountType,
        platform: a.platform,
        expiresAt: expiresAt,
        warrantyDate: now,
        isActive: true,
      };
    });
    try {
      const result = await prisma.garansiAccount.createMany({
        data: dataToInsert,
        skipDuplicates: true,
      });
      console.log(`Inserted ${result.count} new garansi accounts.`);
      return await prisma.garansiAccount.findMany({
        where: { email: { in: accounts.map((x) => x.email) } },
        orderBy: { createdAt: "desc" },
      });
    } catch (error: any) {
      console.error("Error during bulk garansi account insert:", error);
      throw new Error("Failed to add multiple garansi accounts.");
    }
  }
  static async getAllGaransiAccounts() {
    return prisma.garansiAccount.findMany({ orderBy: { createdAt: "desc" } });
  }
  static async getGaransiAccountsByDate(date: Date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error("Invalid date for warranty search.");
    }
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return prisma.garansiAccount.findMany({
      where: { warrantyDate: { gte: startOfDay, lte: endOfDay } },
      orderBy: { warrantyDate: "desc" },
    });
  }
  static async getGaransiAccountsByExpiresAt(date: Date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error("Invalid date for expiry search.");
    }
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return prisma.garansiAccount.findMany({
      where: { expiresAt: { gte: startOfDay, lte: endOfDay } },
      orderBy: { expiresAt: "asc" },
    });
  }

  // ===========================
  // 隼 REPORTED ACCOUNTS
  // ===========================
  static async getAllReportedAccounts() {
    return prisma.reportedAccount.findMany({
      orderBy: { reportedAt: "desc" },
      include: {
        account: {
          select: { id: true, email: true, type: true, platform: true },
        },
      },
    });
  }
  static async reportAccount(
    accountId: string,
    reason: string,
    operatorName?: string | null
  ) {
    if (!accountId || !reason)
      throw new Error("Account ID and reason are required.");
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new Error(`Account with ID ${accountId} not found.`);
    return prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: accountId },
        data: { reported: true },
      });
      const report = await tx.reportedAccount.create({
        data: {
          accountId,
          reportReason: reason,
          operatorName: operatorName ?? "System",
        },
      });
      console.log(
        `Account ${account.email} reported by ${
          operatorName ?? "System"
        }: ${reason}`
      );
      return report;
    });
  }
  static async resolveReport(reportId: string, newPassword?: string) {
    if (!reportId) throw new Error("Report ID is required.");

    return prisma.$transaction(async (tx) => {
      const report = await tx.reportedAccount.findUnique({
        where: { id: reportId },
        select: { accountId: true, resolved: true },
      });

      if (!report) throw new Error(`Report ${reportId} not found.`);

      if (report.resolved) {
        console.warn(`Report ${reportId} already resolved.`);
        return;
      }

      // --- UPDATE DI SINI ---
      await tx.reportedAccount.update({
        where: { id: reportId },
        data: {
          resolved: true,
          resolvedAt: new Date(), // <--- PENTING: Catat waktu penyelesaian!
        },
      });
      // --- AKHIR UPDATE ---

      const accountUpdateData: Prisma.AccountUpdateInput = { reported: false };

      if (newPassword) {
        accountUpdateData.password = newPassword;
      }

      await tx.account.update({
        where: { id: report.accountId },
        data: accountUpdateData,
      });

      console.log(
        `Report ${reportId} resolved at ${new Date().toISOString()}. Account ${
          report.accountId
        } updated.`
      );
    });
  }

  // --- TAMBAHAN BARU ---
  // ===========================
  // 隼 WHATSAPP ACCOUNT CRUD
  // ===========================
  static async getAllWhatsappAccounts(): Promise<WhatsappAccount[]> {
    return prisma.whatsappAccount.findMany({
      orderBy: { name: "asc" },
    });
  }

  static async createWhatsappAccount(data: {
    name: string;
    number: string;
  }): Promise<WhatsappAccount> {
    if (!data.name || !data.number) {
      throw new Error("Name and number are required.");
    }
    return prisma.whatsappAccount.create({ data });
  }

  static async updateWhatsappAccount(
    id: string,
    data: { name?: string; number?: string }
  ): Promise<WhatsappAccount> {
    if (!id) throw new Error("ID is required for update.");
    if (!data.name && !data.number) {
      throw new Error("No data provided for update.");
    }
    return prisma.whatsappAccount.update({
      where: { id },
      data,
    });
  }

  static async deleteWhatsappAccount(id: string): Promise<WhatsappAccount> {
    if (!id) throw new Error("ID is required for deletion.");
    // Opsional: Cek dulu apakah WA ini dipakai di CustomerAssignment
    // Jika iya, mungkin lebih baik jangan dihapus (atau set null)
    return prisma.whatsappAccount.delete({ where: { id } });
  }
  // --- AKHIR TAMBAHAN BARU ---

  // ===========================
  // 隼 CUSTOMER ASSIGNMENTS
  // ===========================
  static async getAllCustomerAssignments() {
    return prisma.customerAssignment.findMany({
      orderBy: { assignedAt: "desc" },
      include: {
        account: {
          select: { id: true, platform: true, expiresAt: true, password: true },
        },
        // --- PERUBAHAN DI SINI ---
        whatsappAccount: {
          select: { name: true, number: true },
        },
        // --- AKHIR PERUBAHAN ---
      },
    });
  }

  // Fungsi addCustomerAssignment dengan logika random profile & perbaikan type guard
  static async addCustomerAssignment(data: {
    customerIdentifier: string;
    // customerWhatsapp?: string; // <-- DIHAPUS
    whatsappAccountId?: string; // <-- DIGANTI
    accountId: string;
    accountEmail: string;
    accountType: AccountType;
    // profileName DIHAPUS
    operatorName?: string;
  }) {
    if (
      !data.customerIdentifier ||
      !data.accountId ||
      !data.accountEmail ||
      !data.accountType
    ) {
      throw new Error("Missing fields.");
    }
    const operator = data.operatorName ?? "System";

    return prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { id: data.accountId },
      });
      if (!account) throw new Error(`Account ${data.accountId} not found.`);

      let profilesArray: unknown;
      if (account.profiles) {
        try {
          if (typeof account.profiles === "string") {
            if (account.profiles.trim() === "") profilesArray = [];
            else profilesArray = JSON.parse(account.profiles);
          } else {
            profilesArray = account.profiles;
          }
        } catch (e) {
          throw new Error(
            `Invalid profiles JSON for account ${data.accountId}.`
          );
        }
      } else {
        throw new Error(`Profiles data missing.`);
      }
      if (!Array.isArray(profilesArray)) {
        throw new Error(`Profiles data is not an array.`);
      }

      // Cari profil tersedia (gunakan p: any)
      const availableProfiles = (profilesArray as unknown as Profile[]).filter(
        (p: any): p is Profile =>
          typeof p === "object" &&
          p !== null &&
          typeof p.profile === "string" &&
          typeof p.pin === "string" &&
          typeof p.used === "boolean" &&
          p.used === false
      );
      if (availableProfiles.length === 0) {
        throw new Error(`No available profiles on account ${data.accountId}.`);
      }

      // Pilih Profil Acak
      const randomIndex = Math.floor(Math.random() * availableProfiles.length);
      const selectedProfile = availableProfiles[randomIndex];
      const selectedProfileName = selectedProfile.profile;
      console.log(
        `[Service] Randomly selected profile "${selectedProfileName}" for account ${data.accountId}`
      );

      // Buat Assignment
      const assignment = await tx.customerAssignment.create({
        data: {
          customerIdentifier: data.customerIdentifier,
          // customerWhatsapp: data.customerWhatsapp, // <-- DIHAPUS
          whatsappAccountId: data.whatsappAccountId, // <-- DIGANTI
          accountId: data.accountId,
          accountEmail: data.accountEmail,
          accountType: data.accountType as PrismaAccountType,
          profileName: selectedProfileName,
          operatorName: operator,
        },
      });

      // Catat Aktivitas
      await tx.operatorActivity.create({
        data: {
          operatorName: operator,
          action: `Assign profile ${selectedProfileName} (${data.accountType}) to ${data.customerIdentifier}`,
          accountEmail: data.accountEmail,
          accountType: data.accountType as PrismaAccountType,
        },
      });

      // Update Profil (gunakan p: any)
      const profileIndexInOriginalArray = (
        profilesArray as unknown as Profile[]
      ).findIndex(
        (p: any) =>
          typeof p === "object" &&
          p !== null &&
          p.profile === selectedProfileName
      );
      if (profileIndexInOriginalArray === -1) {
        throw new Error(
          `Internal error: Selected profile "${selectedProfileName}" not found.`
        );
      }
      const updatedProfiles = [...(profilesArray as unknown as Profile[])];
      updatedProfiles[profileIndexInOriginalArray] = {
        ...selectedProfile,
        used: true,
      };
      await tx.account.update({
        where: { id: data.accountId },
        data: { profiles: updatedProfiles as unknown as Prisma.InputJsonValue },
      });

      console.log(
        `Profile ${selectedProfileName} on account ${data.accountId} marked as used by operator ${operator}.`
      );
      return assignment;
    });
  }

  // ===========================
  // 隼 OPERATOR ACTIVITIES & STATISTICS
  // ===========================
  static async getAllOperatorActivities() {
    return prisma.operatorActivity.findMany({ orderBy: { date: "desc" } });
  }
  static async getCustomerStatistics() {
    const [
      totalAssignments,
      uniqueCustomersGroup,
      privateAccounts,
      sharingAccounts,
      vipAccounts,
    ] = await Promise.all([
      prisma.customerAssignment.count(),
      prisma.customerAssignment.groupBy({
        by: ["customerIdentifier"],
        _count: { _all: true },
      }),
      prisma.customerAssignment.count({ where: { accountType: "private" } }),
      prisma.customerAssignment.count({ where: { accountType: "sharing" } }),
      prisma.customerAssignment.count({ where: { accountType: "vip" } }),
    ]);
    return {
      totalCustomers: uniqueCustomersGroup.length,
      totalAssignments,
      privateAccounts,
      sharingAccounts,
      vipAccounts,
    };
  }
  static async getOperatorStatistics() {
    const activities = await prisma.operatorActivity.findMany({
      orderBy: { date: "asc" },
    });
    type OperatorStats = {
      total: number;
      private: number;
      sharing: number;
      vip: number;
      byDate: Record<string, number>;
    };
    const stats: Record<string, OperatorStats> = {};
    activities.forEach((activity) => {
      const name = activity.operatorName || "Unknown";
      if (!stats[name])
        stats[name] = { total: 0, private: 0, sharing: 0, vip: 0, byDate: {} };
      stats[name].total++;
      if (activity.accountType === "private") stats[name].private++;
      else if (activity.accountType === "sharing") stats[name].sharing++;
      else if (activity.accountType === "vip") stats[name].vip++;
      const activityDate = activity.date;
      if (activityDate) {
        const dateKey = activityDate.toISOString().split("T")[0];
        stats[name].byDate[dateKey] = (stats[name].byDate[dateKey] || 0) + 1;
      } else {
        console.warn(`Activity ${activity.id} has null date.`);
      }
    });
    return stats;
  }
} // Akhir Class
