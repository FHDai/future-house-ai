"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type DashboardShellProps = {
  children: ReactNode;
};

type NavigationItem = {
  label: string;
  href: string;
  description: string;
  icon: ReactNode;
  disabled?: boolean;
};

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M8 14h2M14 14h2M8 18h2" />
    </svg>
  );
}

function CustomersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FacilityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-5h6v5" />
      <path d="M8 9h1M15 9h1M8 12h1M15 12h1" />
    </svg>
  );
}

function CourtIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M12 4v16M3 12h18" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 20V10M10 20V4M16 20v-7M22 20V7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.36.35.68.6.95.28.28.68.44 1.1.45H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10 17l5-5-5-5M15 12H3" />
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    </svg>
  );
}

const navigationItems: NavigationItem[] = [
  {
    label: "Genel Bakış",
    href: "/dashboard",
    description: "İşletme özeti",
    icon: <DashboardIcon />,
  },
  {
    label: "Rezervasyonlar",
    href: "/dashboard/reservations",
    description: "Takvim ve rezervasyonlar",
    icon: <CalendarIcon />,
  },
  {
    label: "Müşteriler",
    href: "/dashboard/customers",
    description: "CRM ve müşteri geçmişi",
    icon: <CustomersIcon />,
  },
  {
    label: "Tesisler",
    href: "/dashboard/facilities",
    description: "Şube ve tesis yönetimi",
    icon: <FacilityIcon />,
  },
  {
    label: "Sahalar",
    href: "/dashboard/courts",
    description: "Saha ve fiyat yönetimi",
    icon: <CourtIcon />,
  },
];

const secondaryNavigationItems: NavigationItem[] = [
  {
    label: "Ödemeler",
    href: "/dashboard/payments",
    description: "Yakında",
    icon: <PaymentIcon />,
    disabled: true,
  },
  {
    label: "Raporlar",
    href: "/dashboard/reports",
    description: "Yakında",
    icon: <ReportsIcon />,
    disabled: true,
  },
  {
    label: "Ayarlar",
    href: "/dashboard/settings",
    description: "Yakında",
    icon: <SettingsIcon />,
    disabled: true,
  },
];

function getPageTitle(pathname: string) {
  if (pathname === "/dashboard") {
    return "Genel Bakış";
  }

  const item = [...navigationItems, ...secondaryNavigationItems].find(
    (navigationItem) =>
      pathname === navigationItem.href ||
      pathname.startsWith(`${navigationItem.href}/`)
  );

  return item?.label ?? "SportOS";
}

function getUserInitial(email: string) {
  return email.trim().charAt(0).toLocaleUpperCase("tr-TR") || "S";
}

export default function DashboardShell({
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const pageTitle = useMemo(
    () => getPageTitle(pathname),
    [pathname]
  );

  const loadUser = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.push("/login");
      return;
    }

    setUserEmail(user.email ?? "");
  }, [router]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  };

  const isNavigationItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = isNavigationItemActive(item.href);

    if (item.disabled) {
      return (
        <div
          key={item.href}
          className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-gray-700"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-900 bg-black">
            {item.icon}
          </span>

          <div className="min-w-0">
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-0.5 truncate text-xs text-gray-700">
              {item.description}
            </p>
          </div>
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition ${
          isActive
            ? "bg-white text-black"
            : "text-gray-400 hover:bg-gray-900 hover:text-white"
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
            isActive
              ? "border-gray-200 bg-gray-100 text-black"
              : "border-gray-800 bg-black text-gray-500 group-hover:border-gray-700 group-hover:text-white"
          }`}
        >
          {item.icon}
        </span>

        <div className="min-w-0">
          <p className="text-sm font-medium">{item.label}</p>

          <p
            className={`mt-0.5 truncate text-xs ${
              isActive ? "text-gray-500" : "text-gray-600"
            }`}
          >
            {item.description}
          </p>
        </div>
      </Link>
    );
  };

  const sidebarContent = (
    <>
      <div className="flex h-20 items-center justify-between border-b border-gray-900 px-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-black">
            S
          </div>

          <div>
            <p className="font-bold tracking-tight text-white">
              SportOS
            </p>

            <p className="text-xs text-gray-600">
              Management Platform
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-800 text-gray-500 transition hover:border-gray-600 hover:text-white lg:hidden"
          aria-label="Menüyü kapat"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-700">
          Yönetim
        </p>

        <nav className="mt-3 space-y-1">
          {navigationItems.map(renderNavigationItem)}
        </nav>

        <p className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-700">
          Finans ve Sistem
        </p>

        <nav className="mt-3 space-y-1">
          {secondaryNavigationItems.map(renderNavigationItem)}
        </nav>
      </div>

      <div className="border-t border-gray-900 p-4">
        <div className="rounded-2xl border border-gray-800 bg-neutral-950 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-sm font-semibold text-white">
              {getUserInitial(userEmail)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">
                Yönetici
              </p>

              <p className="mt-0.5 truncate text-xs text-gray-600">
                {userEmail || "Hesap yükleniyor..."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-800 px-3 py-2.5 text-xs font-medium text-gray-400 transition hover:border-red-900 hover:bg-red-950/30 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogoutIcon />

            {signingOut ? "Çıkış yapılıyor..." : "Güvenli Çıkış"}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-gray-900 bg-black lg:flex">
        {sidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <aside className="relative flex h-full w-[88%] max-w-80 flex-col border-r border-gray-800 bg-black shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-gray-900 bg-black/90 backdrop-blur-xl">
          <div className="flex h-20 items-center gap-4 px-4 md:px-7">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-800 text-gray-400 transition hover:border-gray-600 hover:text-white lg:hidden"
              aria-label="Menüyü aç"
            >
              <MenuIcon />
            </button>

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-600">
                SportOS Admin
              </p>

              <h1 className="mt-1 truncate text-lg font-semibold">
                {pageTitle}
              </h1>
            </div>

            <div className="ml-auto hidden w-full max-w-sm md:block">
              <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-neutral-950 px-4 py-2.5 text-gray-600">
                <SearchIcon />

                <span className="text-sm">
                  Müşteri veya rezervasyon ara
                </span>

                <span className="ml-auto rounded border border-gray-800 px-1.5 py-0.5 text-[10px] text-gray-700">
                  Yakında
                </span>
              </div>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-800 bg-neutral-950 text-sm font-semibold">
              {getUserInitial(userEmail)}
            </div>
          </div>
        </header>

        <div className="min-h-[calc(100vh-5rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}