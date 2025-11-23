"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/contexts/account-context";
import type { Account, PlatformType } from "@prisma/client";
import { PLATFORM_DISPLAY_NAMES } from "@/lib/constants";
import { Search, Copy, X, Loader2 } from "lucide-react"; // Tambah Loader2
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface AccountSearchProps {
  onClose?: () => void;
}

// Helper Profile Type
type Profile = { profile: string; pin: string; used: boolean };

export default function AccountSearch({ onClose }: AccountSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false); // Loading saat tombol Search ditekan
  const { searchAccountsByEmail, getRemainingDays } = useAccounts();
  const { toast } = useToast();
  const [searchResult, setSearchResult] = useState<Account | null>(null);

  // --- STATE LIVE SUGGESTION (AUTOCOMPLETE) ---
  const [suggestions, setSuggestions] = useState<Account[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLiveSearching, setIsLiveSearching] = useState(false); // Loading saat ketik
  const wrapperRef = useRef<HTMLDivElement>(null);

  // --- LOGIC LIVE SEARCH ---
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Cari jika input lebih dari 2 karakter
    if (value.trim().length > 2) {
      setIsLiveSearching(true);
      setShowSuggestions(true);
      try {
        // Panggil API search
        const results = await searchAccountsByEmail(value);
        setSuggestions(results);
      } catch (error) {
        console.error("Live search error:", error);
      } finally {
        setIsLiveSearching(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle Klik Sugesti
  const handleSelectSuggestion = (account: Account) => {
    setSearchTerm(account.email); // Isi input dengan email lengkap
    setSearchResult(account); // Langsung tampilkan hasil
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  // --- END LOGIC LIVE SEARCH ---

  // Handle Manual Search (Tombol Enter/Klik)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) {
      toast({
        title: "Error",
        description: "Please enter an email to search",
        variant: "destructive",
      });
      return;
    }

    // Tutup sugesti saat submit manual
    setShowSuggestions(false);
    setIsSearching(true);
    setSearchResult(null);

    try {
      const results: Account[] = await searchAccountsByEmail(trimmedSearch);
      if (results && results.length > 0) {
        const firstResult = results[0];
        setSearchResult(firstResult);
        toast({
          title: "✅ Account Found",
          description: `Found: ${firstResult.email}${
            results.length > 1 ? ` (+${results.length - 1} more)` : ""
          }`,
        });
      } else {
        setSearchResult(null);
        toast({
          title: "❌ Not Found",
          description: `No account found for: "${trimmedSearch}"`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getPlatformDisplayName = (
    platformKey: PlatformType | null | undefined
  ): string => {
    if (!platformKey) return "N/A";
    const key = platformKey as keyof typeof PLATFORM_DISPLAY_NAMES;
    return PLATFORM_DISPLAY_NAMES[key] || platformKey;
  };

  const copyToClipboard = () => {
    if (!searchResult) return;
    let profilesArray: Profile[] = [];
    if (typeof searchResult.profiles === "string") {
      try {
        profilesArray = JSON.parse(searchResult.profiles);
      } catch {}
    } else if (Array.isArray(searchResult.profiles)) {
      profilesArray = searchResult.profiles as unknown as Profile[];
    }
    const firstAvailableProfile = profilesArray.find(
      (p): p is Profile => typeof p === "object" && !p.used
    );
    const platformName = getPlatformDisplayName(searchResult.platform);
    const accountTypeFormatted =
      searchResult.type.charAt(0).toUpperCase() + searchResult.type.slice(1);
    const daysLeft = getRemainingDays(searchResult);

    const accountText = `!!! ${platformName.toUpperCase()} - TRUSTDIGITAL.ID !!!\n\n1. Login hanya di 1 DEVICE !!\n2. Garansi akun 23 Hari\n3. Ketika ada kendala akun :\n - Hapus chache app\n - (DIBACA) GUNAKAN DATA SELULER/HOTSPOT SAAT LOGIN SAJA\n - Install Ulang App\n4. Dilarang mengubah Nama profile, Pin, membuka pengaturan akun !!\n\n💌 Email: ${
      searchResult.email
    }\n🔑 Password: ${searchResult.password}\n👤 Profil: ${
      firstAvailableProfile?.profile || "No available profiles"
    }\nPIN: ${
      firstAvailableProfile?.pin || "N/A"
    }\nTipe: ${accountTypeFormatted}\n⏱️ Sisa hari: ${daysLeft} hari\n\nMelanggar? Akun ditarik + denda Rp300K\nTerima kasih telah memesan di TrustDigital.ID\nContact: @TRUSTDIGITAL001 | IG: @trustdigital.indonesia`;

    navigator.clipboard.writeText(accountText);
    toast({
      title: "📋 Copied",
      description: `Details for ${platformName} account copied!`,
    });
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResult(null);
    setSuggestions([]);
  };

  return (
    <div className="space-y-4" ref={wrapperRef}>
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex space-x-2">
          {/* INPUT CONTAINER (RELATIVE UNTUK DROPDOWN) */}
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Enter email address..."
              value={searchTerm}
              onChange={handleInputChange} // Pakai handler baru
              onFocus={() => {
                if (searchTerm.length > 2) setShowSuggestions(true);
              }}
              className="pr-8"
              autoComplete="off" // Matikan autocomplete browser agar tidak menumpuk
            />

            {/* Loader Kecil saat ngetik */}
            {isLiveSearching && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}

            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-500 hover:text-gray-800"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            {/* --- DROPDOWN SUGGESTION --- */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto left-0 top-full">
                <ul className="py-1">
                  {suggestions.map((acc) => (
                    <li
                      key={acc.id}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 flex justify-between items-center group"
                      onClick={() => handleSelectSuggestion(acc)}
                    >
                      <div>
                        <div className="font-medium text-sm text-gray-900 group-hover:text-blue-700">
                          {acc.email}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {getPlatformDisplayName(acc.platform)}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {acc.type}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {showSuggestions &&
              suggestions.length === 0 &&
              !isLiveSearching &&
              searchTerm.length > 2 && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 p-3 text-center text-xs text-gray-500 left-0 top-full">
                  No accounts found.
                </div>
              )}
            {/* --- END DROPDOWN --- */}
          </div>

          <Button type="submit" disabled={isSearching || !searchTerm.trim()}>
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>

      {searchResult && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
              ✅ Account Found
            </h3>
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-1" />
              Copy Details
            </Button>
          </div>

          {/* DETAIL AKUN (Layout Grid Rapih) */}
          <div className="space-y-3 font-mono text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  📧 Email:
                </span>
                <div className="bg-white dark:bg-gray-700 p-2 rounded border dark:border-gray-600 break-all font-bold text-gray-800">
                  {searchResult.email}
                </div>
              </div>
              <div>
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  🔑 Password:
                </span>
                <div className="bg-white dark:bg-gray-700 p-2 rounded border dark:border-gray-600 font-bold text-gray-800">
                  {searchResult.password}
                </div>
              </div>

              {/* Badges Info */}
              <div className="flex flex-wrap gap-2 col-span-full mt-1">
                <Badge variant="outline" className="text-xs">
                  {getPlatformDisplayName(searchResult.platform)}
                </Badge>
                <Badge
                  variant={
                    searchResult.type === "private"
                      ? "secondary"
                      : searchResult.type === "vip"
                      ? "default"
                      : "outline"
                  }
                  className="text-xs capitalize"
                >
                  {searchResult.type}
                </Badge>
                {(() => {
                  const daysLeft = getRemainingDays(searchResult);
                  return (
                    <Badge
                      variant={
                        daysLeft < 0
                          ? "destructive"
                          : daysLeft <= 7
                          ? "secondary"
                          : "default"
                      }
                      className="text-xs"
                    >
                      {daysLeft < 0
                        ? `Expired (${Math.abs(daysLeft)}d)`
                        : `${daysLeft} days left`}
                    </Badge>
                  );
                })()}
              </div>
            </div>

            {/* Available Profiles */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <span className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">
                Available Profiles:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {(() => {
                  let profilesArray: Profile[] = [];
                  if (typeof searchResult.profiles === "string") {
                    try {
                      profilesArray = JSON.parse(searchResult.profiles);
                    } catch {}
                  } else if (Array.isArray(searchResult.profiles)) {
                    profilesArray =
                      searchResult.profiles as unknown as Profile[];
                  }
                  const available = profilesArray.filter(
                    (p): p is Profile => typeof p === "object" && !p.used
                  );

                  if (available.length === 0)
                    return (
                      <div className="text-xs text-red-500 italic col-span-2">
                        No available profiles
                      </div>
                    );

                  return available.map((profile, index) => (
                    <div
                      key={index}
                      className="text-xs p-1.5 bg-green-50 text-green-800 rounded border border-green-200 flex justify-between items-center"
                    >
                      <span className="font-bold">{profile.profile}</span>
                      <span className="text-[10px] bg-white px-1 rounded border border-green-100">
                        {profile.pin || "-"}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
