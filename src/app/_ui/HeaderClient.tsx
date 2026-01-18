"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function HeaderClient() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const isApp =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/time") ||
    pathname.startsWith("/expenses") ||
    pathname.startsWith("/profile");

  useEffect(() => {
    if (!isApp) return;
    (async () => {
      const r = await fetch("/api/me", { credentials: "include" }).catch(() => null);
      const j = await r?.json().catch(() => null);
      setRole(j?.auth?.role ?? null);
    })();
  }, [isApp]);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="/" className="flex items-center">
          <div className="relative h-10 w-48 transition-opacity hover:opacity-80">
  <Image src="/logo.svg" alt="Rentabilise.me" fill className="object-contain" priority />
</div>
        </a>

        <nav className="flex items-center gap-1 text-sm">
          <a className="rounded-xl px-3 py-2 text-zinc-200 hover:bg-zinc-900" href="/dashboard">
            Dashboard
          </a>
          <a className="rounded-xl px-3 py-2 text-zinc-200 hover:bg-zinc-900" href="/projects/new">
            Ajouter un projet
          </a>

          {isApp ? (
            <>
              <a className="rounded-xl px-3 py-2 text-zinc-200 hover:bg-zinc-900" href="/profile">
                Profil
              </a>
              {role === "ADMIN" ? (
                <a className="rounded-xl px-3 py-2 text-zinc-200 hover:bg-zinc-900" href="/admin/waitlist">
                  Admin
                </a>
              ) : null}
            </>
          ) : null}

          {isApp ? (
            <button
              disabled={loading}
              className="ml-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
              onClick={logout}
            >
              {loading ? "..." : "Déconnexion"}
            </button>
          ) : (
            <a className="ml-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/login">
              Connexion
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
