"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAccounts,
  type AddCustomerAssignmentPayload,
} from "@/contexts/account-context";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart,
  CheckCircle,
  Copy,
  History,
  Package,
  Loader2,
  Search,
  Shield,
  AlertTriangle,
  X,
} from "lucide-react";
import { PLATFORM_LIST, PLATFORM_DISPLAY_NAMES } from "@/lib/constants";
import type { PlatformType, AccountType } from "@prisma/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import NotificationSystem from "@/components/shared/notification-system";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"; // Import Dialog

// --- HELPER FUNCTIONS ---
type Profile = { profile: string; pin: string; used: boolean };

function parseProfiles(profilesData: unknown): Profile[] {
  if (!profilesData) return [];
  try {
    if (typeof profilesData === "string") {
      return JSON.parse(profilesData);
    }
    if (Array.isArray(profilesData)) {
      return profilesData as Profile[];
    }
    return [];
  } catch {
    return [];
  }
}

export default function OperatorDashboard() {
  const {
    accounts,
    customerAssignments,
    addCustomerAssignment,
    whatsappAccounts,
    isLoading,
    getRemainingDays,
  } = useAccounts();
  const { user } = useAuth();
  const { toast } = useToast();

  // --- STATE FORM ---
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | "">(
    ""
  );
  const [selectedType, setSelectedType] = useState<AccountType | "">("");
  const [customerIdentifier, setCustomerIdentifier] = useState("");
  const [selectedWaId, setSelectedWaId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  // --- STATE HASIL ---
  const [requestResult, setRequestResult] = useState<{
    email: string;
    password: string;
    profile: string;
    pin: string;
    platform: string;
    type: string;
    expiresAt: string | Date;
    waName?: string;
  } | null>(null);

  // --- STATE FILTER STOK ---
  const [stockSearch, setStockSearch] = useState("");

  // --- 1. HITUNG STOK (REAL-TIME) ---
  const stockSummary = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {};

    accounts.forEach((acc) => {
      const profiles = parseProfiles(acc.profiles);
      const availableCount = profiles.filter((p) => !p.used).length;

      if (availableCount > 0) {
        if (!stats[acc.platform]) {
          stats[acc.platform] = { private: 0, sharing: 0, vip: 0 };
        }
        // @ts-ignore
        if (stats[acc.platform][acc.type] !== undefined) {
          // @ts-ignore
          stats[acc.platform][acc.type] += availableCount;
        }
      }
    });
    return stats;
  }, [accounts]);

  // --- 3. HANDLE REQUEST ---
  const handleRequest = async () => {
    if (
      !selectedPlatform ||
      !selectedType ||
      !customerIdentifier ||
      !selectedWaId
    ) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua data.",
        variant: "destructive",
      });
      return;
    }

    // @ts-ignore
    const currentStock = stockSummary[selectedPlatform]?.[selectedType] || 0;
    if (currentStock === 0) {
      toast({
        title: "Stok Habis",
        description: "Tidak ada akun tersedia untuk pilihan ini.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const candidates = accounts.filter(
        (acc) =>
          acc.platform === selectedPlatform &&
          acc.type === selectedType &&
          parseProfiles(acc.profiles).some((p) => !p.used)
      );

      if (candidates.length === 0) throw new Error("Stok habis saat diproses.");

      const randomAccount =
        candidates[Math.floor(Math.random() * candidates.length)];

      const payload: AddCustomerAssignmentPayload = {
        accountId: randomAccount.id,
        accountEmail: randomAccount.email,
        accountType: selectedType,
        customerIdentifier: customerIdentifier.trim(),
        whatsappAccountId: selectedWaId,
        operatorName: user?.username || "Operator",
      };

      const result = await addCustomerAssignment(payload);

      if (!result) throw new Error("Gagal memproses request.");

      const profiles = parseProfiles(randomAccount.profiles);
      const assignedProfile = profiles.find(
        (p) => p.profile === result.profileName
      );

      setRequestResult({
        email: randomAccount.email,
        password: randomAccount.password,
        profile: result.profileName,
        pin: assignedProfile?.pin || "-",
        platform:
          PLATFORM_DISPLAY_NAMES[selectedPlatform as PlatformType] ||
          selectedPlatform,
        type: selectedType,
        expiresAt: randomAccount.expiresAt,
        waName: whatsappAccounts.find((w) => w.id === selectedWaId)?.name,
      });

      toast({ title: "✅ Berhasil!", description: "Akun berhasil diambil." });
      setCustomerIdentifier("");
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getCopyText = () => {
    if (!requestResult) return "";
    const daysLeft = getRemainingDays({
      expiresAt: new Date(requestResult.expiresAt),
    } as any);
    return `!!! ${requestResult.platform.toUpperCase()} - TRUSTDIGITAL.ID !!!\n\n1. Login hanya di 1 DEVICE !!\n2. Garansi akun 23 Hari\n3. Ketika ada kendala akun :\n - Hapus chache app\n - GUNAKAN DATA SELULER/HOTSPOT SAAT LOGIN\n - Install Ulang App\n4. Dilarang mengubah Nama profile, Pin, settingan !!\n\n💌 Email: ${
      requestResult.email
    }\n🔑 Password: ${requestResult.password}\n👤 Profil: ${
      requestResult.profile
    }\nPIN: ${requestResult.pin}\nTipe: ${
      requestResult.type
    }\n📱 Customer: ${customerIdentifier}\n📞 WA Admin: ${
      requestResult.waName || "-"
    }\n⏱️ Expired: ${new Date(requestResult.expiresAt).toLocaleDateString(
      "id-ID"
    )} (${daysLeft} hari)\n\nMelanggar? Akun ditarik + denda Rp300K\nTerima kasih!\nContact: @TRUSTDIGITAL001`;
  };

  const [historyPlatformFilter, setHistoryPlatformFilter] = useState<
    PlatformType | "all"
  >("all");

  // --- 2. HISTORY USER (UPDATE: Dengan Filter & Search) ---
  const myHistory = useMemo(() => {
    if (!user) return [];

    // 1. Ambil history milik user ini saja
    let history = customerAssignments.filter(
      (assign) => assign.operatorName === user.username
    );

    // 2. Filter by Platform
    if (historyPlatformFilter !== "all") {
      history = history.filter(
        (item) => item.account?.platform === historyPlatformFilter
      );
    }

    // 3. Filter by Search Text (BARU)
    if (historySearch.trim()) {
      const lowerSearch = historySearch.toLowerCase();
      history = history.filter(
        (item) =>
          item.customerIdentifier.toLowerCase().includes(lowerSearch) ||
          item.profileName.toLowerCase().includes(lowerSearch) ||
          (item.account?.platform || "").toLowerCase().includes(lowerSearch)
      );
    }

    // 4. Sort terbaru di atas
    return history.sort(
      (a, b) =>
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
  }, [customerAssignments, user, historyPlatformFilter, historySearch]); // <--- Jangan lupa tambah dependency historySearch

  if (isLoading)
    return <div className="p-8 text-center">Memuat workspace...</div>;

  return (
    <div className="space-y-8">
      {/* --- HEADER & TOOLBAR OPERATOR --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm border border-blue-100 gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-semibold text-sm uppercase tracking-wide text-gray-500"></span>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/dashboard/garansi" passHref>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Shield className="h-4 w-4" />
                    Cek Garansi
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Halaman Cek Garansi</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/dashboard/reported" passHref>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Lapor Masalah
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Laporkan Akun Bermasalah</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="ml-auto md:ml-0 pl-2 border-l border-gray-200">
            <NotificationSystem />
          </div>
        </div>
      </div>

      {/* --- GRID UTAMA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* KOLOM KIRI: STOK */}
        <div className="lg:col-span-1 h-[370px]">
          <Card className="border-blue-200 shadow-md overflow-hidden flex flex-col h-full ">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="flex items-center text-lg">
                <Package className="mr-2 h-5 w-5 text-blue-600" />
                Info Stok Real-time
              </CardTitle>
              <div className="pt-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input
                    placeholder="Cari platform..."
                    className="h-8 pl-8 text-xs"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4 bg-gray-50/50">
              <div className="space-y-3">
                {PLATFORM_LIST.filter((p) =>
                  p.name.toLowerCase().includes(stockSearch.toLowerCase())
                ).map((p) => {
                  const stock = stockSummary[p.key];
                  if (!stock && !stockSearch) return null;
                  const total =
                    (stock?.private || 0) +
                    (stock?.sharing || 0) +
                    (stock?.vip || 0);
                  return (
                    <div
                      key={p.key}
                      className={`bg-white p-3 rounded-lg border shadow-sm transition-all ${
                        total === 0
                          ? "opacity-60 grayscale"
                          : "hover:border-blue-300"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-bold text-sm text-gray-800 truncate">
                          {p.name}
                        </div>
                        {total === 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            Habis
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div className="bg-blue-50 rounded p-1">
                          <div className="text-[10px] text-blue-600 font-medium">
                            Private
                          </div>
                          <div className="font-bold text-blue-800">
                            {stock?.private || 0}
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded p-1">
                          <div className="text-[10px] text-purple-600 font-medium">
                            Share
                          </div>
                          <div className="font-bold text-purple-800">
                            {stock?.sharing || 0}
                          </div>
                        </div>
                        <div className="bg-yellow-50 rounded p-1">
                          <div className="text-[10px] text-yellow-600 font-medium">
                            VIP
                          </div>
                          <div className="font-bold text-yellow-800">
                            {stock?.vip || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {PLATFORM_LIST.filter((p) =>
                  p.name.toLowerCase().includes(stockSearch.toLowerCase())
                ).length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-4">
                    Platform tidak ditemukan
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-2 border-t bg-white text-[10px] text-center text-gray-400">
              Stok diupdate otomatis
            </div>
          </Card>
        </div>

        {/* KOLOM KANAN: REQUEST */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-[370px]">
          <Card className="border-blue-200 shadow-md h-full">
            <CardHeader className="bg-blue-600 text-white rounded-t-lg py-4">
              <CardTitle className="flex items-center text-lg">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Form Request
              </CardTitle>
              <CardDescription className="text-blue-100 text-xs">
                Isi data customer untuk mengambil stok secara acak.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>1. Platform</Label>
                    <Select
                      value={selectedPlatform}
                      onValueChange={(v) =>
                        setSelectedPlatform(v as PlatformType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Platform..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_LIST.map((p) => (
                          <SelectItem key={p.key} value={p.key}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>2. Tipe Akun</Label>
                    <Select
                      value={selectedType}
                      onValueChange={(v) => setSelectedType(v as AccountType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Tipe..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sharing">Sharing</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>3. Data Customer</Label>
                    <Input
                      placeholder="Nama / No. HP"
                      value={customerIdentifier}
                      onChange={(e) => setCustomerIdentifier(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>4. Akun WA Operator</Label>
                    <Select
                      value={selectedWaId}
                      onValueChange={setSelectedWaId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih WA..." />
                      </SelectTrigger>
                      <SelectContent>
                        {whatsappAccounts.map((wa) => (
                          <SelectItem key={wa.id} value={wa.id}>
                            {wa.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-500">
                  {selectedPlatform && selectedType ? (
                    <span>
                      Stok terpilih:{" "}
                      <Badge variant="secondary" className="ml-1 text-sm">
                        {/* @ts-ignore */}
                        {stockSummary[selectedPlatform]?.[selectedType] || 0}
                      </Badge>
                    </span>
                  ) : (
                    "Pilih platform & tipe untuk cek stok"
                  )}
                </div>
                <Button
                  className="w-full md:w-auto min-w-[200px] bg-green-600 hover:bg-green-700 h-11 font-bold text-base"
                  onClick={handleRequest}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Memproses...
                    </>
                  ) : (
                    "🚀 Request Accounts"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- POPUP HASIL REQUEST (DIALOG) --- */}
      <Dialog
        open={!!requestResult}
        onOpenChange={(open) => !open && setRequestResult(null)}
      >
        <DialogContent className="sm:max-w-lg border-2 border-green-500">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-700 text-xl">
              <CheckCircle className="mr-2 h-6 w-6" />
              Request Berhasil!
            </DialogTitle>
            <DialogDescription>
              Akun berhasil diambil. Silakan salin data berikut.
            </DialogDescription>
          </DialogHeader>

          {requestResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 uppercase">Email</Label>
                <div className="bg-slate-100 p-2 rounded border font-mono font-bold select-all text-sm truncate">
                  {requestResult.email}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 uppercase">
                  Password
                </Label>
                <div className="bg-slate-100 p-2 rounded border font-mono font-bold select-all text-sm truncate">
                  {requestResult.password}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 uppercase">
                  Profile
                </Label>
                <div className="bg-blue-50 p-2 rounded border border-blue-200 font-bold text-blue-800 text-sm">
                  {requestResult.profile}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 uppercase">PIN</Label>
                <div className="bg-blue-50 p-2 rounded border border-blue-200 font-bold text-blue-800 text-sm">
                  {requestResult.pin}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between gap-2">
            <Button variant="outline" onClick={() => setRequestResult(null)}>
              Tutup
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              onClick={() => {
                navigator.clipboard.writeText(getCopyText());
                toast({
                  title: "Disalin!",
                  description: "Format chat siap dikirim.",
                });
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy Format Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HISTORY */}
      {/* HISTORY */}
      <div className="mt-8">
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-gray-50/50 py-3 px-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Judul & Total */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-md">
                  <History className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base text-gray-800">
                    Riwayat Transaksi
                  </CardTitle>
                  <p className="text-[10px] text-gray-500 font-normal">
                    Total: {myHistory.length} transaksi
                  </p>
                </div>
              </div>

              {/* Filter Platform History */}
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                {/* INPUT SEARCH BARU */}
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input
                    placeholder="Cari customer/profil..."
                    className="h-8 pl-8 text-xs bg-white"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </div>

                {/* DROPDOWN FILTER (YANG LAMA) */}
                <Select
                  value={historyPlatformFilter}
                  onValueChange={(v) =>
                    setHistoryPlatformFilter(v as PlatformType | "all")
                  }
                >
                  <SelectTrigger className="h-8 w-full sm:w-[160px] text-xs bg-white">
                    <SelectValue placeholder="Semua Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Platform</SelectItem>
                    {PLATFORM_LIST.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* SCROLL AREA: Max Height 400px agar tidak memanjang ke bawah */}
            <ScrollArea className="h-[400px]">
              <div className="min-w-[600px]">
                {" "}
                {/* Min-width agar tabel tidak hancur di mobile */}
                <Table>
                  <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[160px] text-xs font-semibold">
                        Waktu
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Customer
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Platform
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Tipe
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Profil
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myHistory.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-12 text-gray-400 text-xs"
                        >
                          {historyPlatformFilter !== "all"
                            ? `Tidak ada riwayat untuk ${
                                PLATFORM_DISPLAY_NAMES[historyPlatformFilter] ||
                                historyPlatformFilter
                              }`
                            : "Belum ada transaksi hari ini."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      myHistory.map((item) => (
                        <TableRow
                          key={item.id}
                          className="hover:bg-blue-50/50 border-b border-gray-100"
                        >
                          <TableCell className="text-xs text-gray-500">
                            {new Date(item.assignedAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric", // <--- Tambahan di sini
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="font-medium text-sm text-gray-800 py-3">
                            {item.customerIdentifier}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {PLATFORM_DISPLAY_NAMES[
                              item.account?.platform as PlatformType
                            ] || item.account?.platform}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-normal bg-gray-100 text-gray-600 border-gray-200"
                            >
                              {item.accountType}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="font-mono text-xs text-blue-600 font-medium bg-blue-50 inline-block px-2 py-1 rounded border border-blue-100">
                              {item.profileName}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
