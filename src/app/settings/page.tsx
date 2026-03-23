"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

type ProfileRow = {
  role: Role;
  full_name: string | null;
  email: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = data.user;
        if (!user) {
          router.push("/auth?mode=signin");
          return;
        }

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("role, full_name, email")
          .eq("id", user.id)
          .single();
        if (profileErr) throw profileErr;

        if (cancelled) return;
        const row = profile as unknown as ProfileRow;
        setRole(row.role);
        setEmail(row.email ?? user.email ?? null);
        setFullName(row.full_name ?? "");
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { data, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = data.user;
      if (!user) throw new Error("Not signed in");

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);
      if (updateErr) throw updateErr;

      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 px-6 pb-16 max-w-3xl mx-auto">
        <div className="pt-8 mb-8">
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Update your personal details.</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70 mb-2">
                Role
              </div>
              <div className="h-11 px-3 rounded-xl border border-border/50 bg-muted/40 flex items-center text-sm text-foreground/80">
                {role ? ROLE_LABELS[role] : (loading ? "Loading..." : "—")}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70 mb-2">
                Email
              </div>
              <div className="h-11 px-3 rounded-xl border border-border/50 bg-muted/40 flex items-center text-sm text-foreground/80 truncate">
                {email ?? (loading ? "Loading..." : "—")}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground/70">
                Email changes are not supported here yet.
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70 mb-2">
                Full name
              </div>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                disabled={loading}
                className="w-full h-11 px-3 rounded-xl bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={save}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

