"use client";

import { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, Info, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccounts } from "@/contexts/account-context";
import { useAuth } from "@/lib/auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Account } from "@prisma/client";

interface Notification {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationSystem() {
  const {
    accounts,
    getAvailableProfileCount,
    reportedAccounts,
    getRemainingDays,
  } = useAccounts();

  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // State untuk menyimpan ID notifikasi yang sudah dibaca DAN dihapus
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Load Read & Dismissed IDs dari LocalStorage saat mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load Read Status
      const storedRead = localStorage.getItem("read_notifications");
      if (storedRead) {
        try {
          setReadIds(new Set(JSON.parse(storedRead)));
        } catch (e) {
          console.error(e);
        }
      }

      // Load Dismissed Status
      const storedDismissed = localStorage.getItem("dismissed_notifications");
      if (storedDismissed) {
        try {
          setDismissedIds(new Set(JSON.parse(storedDismissed)));
        } catch (e) {
          console.error(e);
        }
      }

      setIsInitialized(true);
    }
  }, []);

  // 2. Generate Notifikasi
  useEffect(() => {
    if (!accounts || !user || !isInitialized) return;

    const rawNotifications: Notification[] = [];
    const now = new Date();
    const isRead = (id: string) => readIds.has(id);

    // --- A. GLOBAL ALERTS (Low Stock) ---
    const privateStock = getAvailableProfileCount("private");
    const sharingStock = getAvailableProfileCount("sharing");
    const vipStock = getAvailableProfileCount("vip");

    if (privateStock <= 5) {
      const id = `low-private-${now.getDate()}`;
      rawNotifications.push({
        id,
        type: "warning",
        title: "Stok Private Kritis",
        message: `Hanya tersisa ${privateStock} profil Private`,
        timestamp: now.toISOString(),
        read: isRead(id),
      });
    }
    if (sharingStock <= 10) {
      const id = `low-sharing-${now.getDate()}`;
      rawNotifications.push({
        id,
        type: "warning",
        title: "Stok Sharing Menipis",
        message: `Hanya tersisa ${sharingStock} profil Sharing`,
        timestamp: now.toISOString(),
        read: isRead(id),
      });
    }
    if (vipStock <= 3) {
      const id = `low-vip-${now.getDate()}`;
      rawNotifications.push({
        id,
        type: "warning",
        title: "Stok VIP Kritis",
        message: `Hanya tersisa ${vipStock} profil VIP`,
        timestamp: now.toISOString(),
        read: isRead(id),
      });
    }

    // --- B. EXPIRING ACCOUNTS (Admin Only) ---
    if (user.role === "admin") {
      const expiringAccounts = accounts.filter((account: Account) => {
        const daysLeft = getRemainingDays(account);
        return daysLeft > 0 && daysLeft <= 3;
      });

      if (expiringAccounts.length > 0) {
        const id = `expiring-${now.getDate()}`;
        rawNotifications.push({
          id,
          type: "warning",
          title: "Akun Akan Expired",
          message: `${expiringAccounts.length} akun akan mati dalam 3 hari`,
          timestamp: now.toISOString(),
          read: isRead(id),
        });
      }
    }

    // --- C. LAPORAN (Admin vs Operator) ---
    if (user.role === "admin") {
      const unresolvedReports = reportedAccounts.filter((r) => !r.resolved);
      if (unresolvedReports.length > 0) {
        const id = `admin-unresolved-${now.getDate()}-${
          unresolvedReports.length
        }`;
        rawNotifications.push({
          id,
          type: "error",
          title: "Laporan Masalah Baru",
          message: `Ada ${unresolvedReports.length} akun dilaporkan & butuh tindakan.`,
          timestamp: now.toISOString(),
          read: isRead(id),
        });
      }
    } else if (user.role === "operator") {
      const myResolvedReports = reportedAccounts.filter((r) => {
        const isMyReport = r.operatorName === user.username;
        const isResolved = r.resolved === true;
        let isRecent = false;
        if (r.resolvedAt) {
          const resolvedTime = new Date(r.resolvedAt).getTime();
          const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;
          isRecent = resolvedTime > oneDayAgo;
        }
        return isMyReport && isResolved && isRecent;
      });

      myResolvedReports.forEach((report) => {
        const id = `resolved-${report.id}`;
        rawNotifications.push({
          id,
          type: "success",
          title: "Laporan Diselesaikan",
          message: `Akun ${report.account?.email} telah diperbaiki oleh Admin.`,
          timestamp: report.resolvedAt
            ? report.resolvedAt.toString()
            : now.toISOString(),
          read: isRead(id),
        });
      });
    }

    // FILTER DISMISSED: Hanya ambil yang belum di-dismiss
    const activeNotifications = rawNotifications.filter(
      (n) => !dismissedIds.has(n.id)
    );

    // Update State
    setNotifications((prev) => {
      // Sorting: Terbaru di atas
      const sorted = [...activeNotifications].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return sorted;
    });
  }, [
    accounts,
    reportedAccounts,
    user,
    getAvailableProfileCount,
    getRemainingDays,
    readIds,
    dismissedIds,
    isInitialized,
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // --- HANDLERS ---

  const updateReadStorage = (newSet: Set<string>) => {
    setReadIds(newSet);
    localStorage.setItem(
      "read_notifications",
      JSON.stringify(Array.from(newSet))
    );
  };

  const updateDismissedStorage = (newSet: Set<string>) => {
    setDismissedIds(newSet);
    localStorage.setItem(
      "dismissed_notifications",
      JSON.stringify(Array.from(newSet))
    );
  };

  const markAsRead = (id: string) => {
    const newSet = new Set(readIds);
    newSet.add(id);
    updateReadStorage(newSet);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    const newSet = new Set(readIds);
    notifications.forEach((n) => newSet.add(n.id));
    updateReadStorage(newSet);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    // 1. Hapus dari UI
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    // 2. Simpan ke Dismissed Storage agar tidak muncul lagi saat refresh
    const newSet = new Set(dismissedIds);
    newSet.add(id);
    updateDismissedStorage(newSet);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMins < 1) return "Baru saja";
      if (diffMins < 60) return `${diffMins}m lalu`;
      if (diffHours < 24) return `${diffHours}j lalu`;
      return `${diffDays}h lalu`;
    } catch {
      return "-";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Notifikasi</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-auto py-1 px-2"
                >
                  Tandai semua dibaca
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Tidak ada notifikasi baru</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? "bg-blue-50/60" : "bg-white"
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            !notification.read
                              ? "font-bold text-gray-900"
                              : "font-medium text-gray-700"
                          } truncate`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center mt-1.5">
                          <Clock className="h-3 w-3 text-gray-400 mr-1" />
                          <span className="text-[10px] text-gray-400">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-transparent"
                        title="Hapus Notifikasi"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
