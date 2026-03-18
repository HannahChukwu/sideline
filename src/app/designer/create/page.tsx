"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Sparkles, Loader2, Download, Share2, RefreshCw, Wand2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { SPORTS, ASSET_TYPES, type AssetType } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";
import { generateImage } from "@/lib/imageGen/provider";

interface FormState {
  type: AssetType;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  eventDate: string;
  customPrompt: string;
  style: string;
}

const STYLES = [
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold & Dramatic" },
  { value: "retro", label: "Retro" },
  { value: "cinematic", label: "Cinematic" },
];

export default function CreateAsset() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    type: "gameday",
    sport: "Basketball",
    homeTeam: "",
    awayTeam: "",
    homeScore: "",
    awayScore: "",
    eventDate: "",
    customPrompt: "",
    style: "bold",
  });
  const [step, setStep] = useState<"form" | "generating" | "result">("form");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Instagram (designer MVP: Create Asset → connect + post while staying on page)
  const [igConnected, setIgConnected] = useState<boolean | null>(null);
  const [igUserId, setIgUserId] = useState<string | null>(null);
  const [igCaption, setIgCaption] = useState<string>("");
  const [igPosting, setIgPosting] = useState(false);
  const [igPostError, setIgPostError] = useState<string | null>(null);
  const [igPostSuccess, setIgPostSuccess] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const isScoreType = form.type === "final-score";

  const defaultInstagramCaption = useMemo(() => {
    const teamA = form.homeTeam || "Team";
    const teamB = form.awayTeam || "Opponent";
    const when = form.eventDate ? `📅 ${form.eventDate}` : "Game day";
    const scoreLine =
      isScoreType && form.homeScore && form.awayScore
        ? `Final score: ${form.homeScore}-${form.awayScore}`
        : "";

    const tags = ["#SidelineStudio", "#GameDay", "#Athletics"]
      .concat(teamA.trim() ? [`#${teamA.trim().replace(/\s+/g, "")}`] : [])
      .concat(teamB.trim() ? [`#${teamB.trim().replace(/\s+/g, "")}`] : [])
      .join(" ");

    const cta = "Be there.";

    const paragraphs = [
      `${teamA} vs ${teamB} ${when}`,
      [scoreLine, cta].filter(Boolean).join("\n"),
      tags,
    ].filter(Boolean);

    // Instagram captions can include multiple paragraphs via \n.
    return paragraphs.join("\n\n").slice(0, 2200);
  }, [form.awayScore, form.awayTeam, form.eventDate, form.homeScore, form.homeTeam, isScoreType]);

  useEffect(() => {
    let cancelled = false;

    async function loadInstagramStatus() {
      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = userRes.user;

        if (!user) {
          if (!cancelled) setIgConnected(false);
          return;
        }

        const res = await fetch("/api/instagram/status", { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        setIgConnected(Boolean(json.connected));
        setIgUserId(json.ig_user_id ?? null);
      } catch {
        if (!cancelled) setIgConnected(false);
      }
    }

    // Avoid flashing the connect UI while we don't yet know.
    setIgConnected(null);
    loadInstagramStatus();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (step !== "result") return;
    if (!generatedImageUrl) return;

    // Only set a default caption if the user hasn't typed one yet.
    setIgCaption((prev) => (prev.trim().length ? prev : defaultInstagramCaption));
  }, [step, generatedImageUrl, defaultInstagramCaption]);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function generate() {
    setError(null);
    setStep("generating");
    setIgCaption("");
    setIgPostError(null);
    setIgPostSuccess(null);
    // Simulate AI generation delay
    await new Promise((r) => setTimeout(r, 2800));
    const prompt = [
      `${form.type} for ${form.sport}`,
      `${form.homeTeam} vs ${form.awayTeam}`,
      form.eventDate ? `event date: ${form.eventDate}` : "",
      isScoreType && form.homeScore && form.awayScore ? `final score: ${form.homeScore}-${form.awayScore}` : "",
      form.style ? `style: ${form.style}` : "",
      form.customPrompt ? `notes: ${form.customPrompt}` : "",
    ].filter(Boolean).join(" | ");
    const res = await generateImage({ prompt });
    setGeneratedImageUrl(res.imageUrl);
    setStep("result");
  }

  function regenerate() {
    setError(null);
    setStep("generating");
    setIgCaption("");
    setIgPostError(null);
    setIgPostSuccess(null);
    setTimeout(() => {
      const prompt = [
        `${form.type} for ${form.sport}`,
        `${form.homeTeam} vs ${form.awayTeam}`,
        form.eventDate ? `event date: ${form.eventDate}` : "",
        `style: ${form.style}`,
        `variant: ${Math.random()}`,
      ].filter(Boolean).join(" | ");
      generateImage({ prompt }).then((res) => setGeneratedImageUrl(res.imageUrl)).catch(() => {});
      setStep("result");
    }, 2000);
  }

  const canPublish =
    step === "result" &&
    !!generatedImageUrl &&
    !!form.homeTeam &&
    !!form.awayTeam &&
    !!form.eventDate &&
    !publishLoading;

  async function insertAssetRecord(): Promise<void> {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const user = userRes.user;
    if (!user) throw new Error("Not signed in");

    const now = new Date().toISOString();
    const homeScore = isScoreType && form.homeScore !== "" ? Number(form.homeScore) : null;
    const awayScore = isScoreType && form.awayScore !== "" ? Number(form.awayScore) : null;

    const { error: insertErr } = await supabase.from("assets").insert({
      designer_id: user.id,
      title: `${form.homeTeam} vs ${form.awayTeam}`,
      type: form.type,
      status: "published",
      sport: form.sport,
      home_team: form.homeTeam,
      away_team: form.awayTeam,
      home_score: Number.isFinite(homeScore as number) ? (homeScore as number) : null,
      away_score: Number.isFinite(awayScore as number) ? (awayScore as number) : null,
      event_date: form.eventDate,
      image_url: generatedImageUrl,
      created_at: now,
      updated_at: now,
      published_at: now,
    });

    if (insertErr) throw insertErr;
  }

  async function publish() {
    if (!generatedImageUrl) return;
    setError(null);
    setPublishLoading(true);
    try {
      await insertAssetRecord();

      router.push("/designer");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setPublishLoading(false);
    }
  }

  function connectInstagram() {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/api/instagram/connect?next=${encodeURIComponent(next)}`;
  }

  async function postToInstagram() {
    if (!generatedImageUrl) return;
    if (!igConnected) return;

    setIgPostError(null);
    setIgPostSuccess(null);
    setIgPosting(true);

    try {
      const caption = igCaption.trim();
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: generatedImageUrl, caption }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to publish to Instagram");
      }

      setIgPostSuccess("Posted to Instagram successfully.");
    } catch (e: unknown) {
      setIgPostError(e instanceof Error ? e.message : "Failed to post to Instagram");
    } finally {
      setIgPosting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 px-6 pb-16 max-w-6xl mx-auto">
        <div className="pt-8 mb-8 flex items-center gap-4">
          <Link
            href="/designer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-sm text-muted-foreground">Create Asset</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left — Form */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Generate Asset</h1>
              <p className="text-sm text-muted-foreground">Fill in the details and let AI handle the design.</p>
            </div>

            {/* Asset type */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Asset Type</label>
              <div className="grid grid-cols-2 gap-2">
                {ASSET_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => set("type", t.value)}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                      form.type === t.value
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/50 bg-card text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sport */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Sport</label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    onClick={() => set("sport", s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      form.sport === s
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "bg-card border border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <select
                  value={SPORTS.slice(0, 8).includes(form.sport) ? "" : form.sport}
                  onChange={(e) => e.target.value && set("sport", e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-card border border-border/50 text-muted-foreground cursor-pointer"
                >
                  <option value="">More...</option>
                  {SPORTS.slice(8).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Teams */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Home Team</label>
                <input
                  type="text"
                  value={form.homeTeam}
                  onChange={(e) => set("homeTeam", e.target.value)}
                  placeholder="Falcons"
                  className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Away Team</label>
                <input
                  type="text"
                  value={form.awayTeam}
                  onChange={(e) => set("awayTeam", e.target.value)}
                  placeholder="Rivals"
                  className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Scores (only for final-score) */}
            {isScoreType && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Home Score</label>
                  <input
                    type="number"
                    value={form.homeScore}
                    onChange={(e) => set("homeScore", e.target.value)}
                    placeholder="87"
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Away Score</label>
                  <input
                    type="number"
                    value={form.awayScore}
                    onChange={(e) => set("awayScore", e.target.value)}
                    placeholder="74"
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Event date */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Event Date</label>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => set("eventDate", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all [color-scheme:dark]"
              />
            </div>

            {/* Visual style */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Visual Style</label>
              <div className="grid grid-cols-4 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => set("style", s.value)}
                    className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                      form.style === s.value
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/50 bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom prompt */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Additional Instructions <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <textarea
                value={form.customPrompt}
                onChange={(e) => set("customPrompt", e.target.value)}
                placeholder="Add team colors, special effects, taglines, or anything specific..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
              />
            </div>

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={step === "generating" || !form.homeTeam || !form.awayTeam}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed glow-orange-sm hover:glow-orange"
            >
              {step === "generating" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Asset
                </>
              )}
            </button>

            {error && (
              <div className="px-3.5 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                {error}
              </div>
            )}
          </div>

          {/* Right — Preview */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Preview</span>
                {step === "result" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={regenerate}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-all"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                )}
              </div>

              <div className="aspect-[16/9] relative bg-muted/30">
                {step === "form" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
                    <Sparkles className="w-8 h-8" />
                    <span className="text-sm">Your asset will appear here</span>
                  </div>
                )}

                {step === "generating" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    {/* Animated dots */}
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                      <div className="absolute inset-2 rounded-full border-2 border-primary/40" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-primary animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground mb-1">Generating your asset</p>
                      <p className="text-xs text-muted-foreground">AI is crafting your design...</p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-[progress_2.8s_ease-in-out_forwards]" style={{ width: "0%", animation: "none", transition: "width 2.8s ease-in-out", }} ref={(el) => { if (el) setTimeout(() => { el.style.width = "100%"; }, 50); }} />
                    </div>
                  </div>
                )}

                {step === "result" && (
                  <Image
                    src={generatedImageUrl ?? "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80"}
                    alt="Generated asset"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1200px) 50vw, 600px"
                  />
                )}
              </div>

              {step === "result" && (
                <div className="p-4 border-t border-border/50">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {form.homeTeam || "Home"} vs {form.awayTeam || "Away"}
                    {isScoreType && form.homeScore && ` — ${form.homeScore}–${form.awayScore}`}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">{form.sport} · {ASSET_TYPES.find((t) => t.value === form.type)?.label}</p>

                  <div className="mt-3">
                    <div className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/70 mb-2">
                      Instagram caption
                    </div>
                    <textarea
                      value={igCaption}
                      onChange={(e) => setIgCaption(e.target.value)}
                      rows={3}
                      placeholder="Write the caption you want to post…"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none [color-scheme:dark]"
                    />
                  </div>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    <button
                      onClick={publish}
                      disabled={!canPublish}
                      className="flex-1 min-w-[220px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all glow-orange-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {publishLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                      Save to feeds
                    </button>

                    <button
                      onClick={() => (igConnected ? postToInstagram() : connectInstagram())}
                      disabled={
                        igConnected === null ||
                        igPosting ||
                        (igConnected === true && !igCaption.trim()) ||
                        !generatedImageUrl
                      }
                      className={[
                        "flex-1 min-w-[220px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                        igConnected ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-orange-sm" : "bg-muted text-foreground hover:bg-muted/70",
                      ].join(" ")}
                    >
                      {igPosting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : igConnected ? (
                        <Share2 className="w-3.5 h-3.5" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" />
                      )}
                      {igPosting ? "Posting…" : igConnected ? "Post to Instagram" : igConnected === null ? "Checking Instagram…" : "Connect Instagram"}
                    </button>

                    <button className="flex items-center justify-center gap-2 min-w-[140px] px-4 py-2.5 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/70 transition-all">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {igPostError && (
                    <div className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                      {igPostError}
                    </div>
                  )}

                  {igPostSuccess && (
                    <div className="mt-3 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
                      {igPostSuccess}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
