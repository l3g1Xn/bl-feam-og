import { useEffect, useMemo, useState } from "react";
import {
  STORE_OFFERS,
  useMetaStore,
  xpProgressInLevel,
  type LauncherTab,
} from "@/game/meta";
import { cardArtSrc, classLabel, getCard, typeLabel } from "@/game/cards";
import { configureGraphics } from "@/game/graphics";
import { playSfx, setSfxMuted, setSfxVolume, unlockAudio } from "@/game/audio";
import {
  currentTrack,
  ensureMusicUnlocked,
  setMusicMuted,
  setMusicVolume,
  skipTrack,
  startMenuMusic,
  MENU_TRACKS,
} from "@/game/music";
import { useGameStore } from "@/game/store";
import { BUILD_ID, GAME_TITLE, GAME_TITLE_SHORT } from "@/game/brand";
import { AmbientStage } from "./AmbientStage";
import { ApkDownloadButton } from "./ApkDownloadButton";
import { CardView } from "./CardView";
import { SettingsPanel } from "./SettingsPanel";
import { isWebSite } from "@/lib/platform";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import {
  BookOpen,
  FolderOpen,
  Save,
  Home,
  Music2,
  Package,
  Settings2,
  ShoppingBag,
  SkipForward,
  Swords,
  Ticket,
} from "lucide-react";

const NAV: { id: LauncherTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "play", label: "Play", icon: Swords },
  { id: "store", label: "Store", icon: ShoppingBag },
  { id: "collection", label: "Collection", icon: Package },
  { id: "settings", label: "Settings", icon: Settings2 },
];

export function Launcher() {
  const tab = useMetaStore((s) => s.launcherTab);
  const setTab = useMetaStore((s) => s.setTab);
  const tickets = useMetaStore((s) => s.tickets);
  const totalXp = useMetaStore((s) => s.totalXp);
  const msg = useMetaStore((s) => s.lastMessage);
  const quality = useMetaStore((s) => s.quality);
  const targetHz = useMetaStore((s) => s.targetHz);
  const aspectMode = useMetaStore((s) => s.aspectMode);
  const reducedShake = useMetaStore((s) => s.reducedShake);
  const sfxVolume = useMetaStore((s) => s.sfxVolume);
  const sfxMuted = useMetaStore((s) => s.sfxMuted);
  const [trackTitle, setTrackTitle] = useState(currentTrack().title);

  useEffect(() => {
    configureGraphics({ quality, targetHz, aspectMode, reducedShake });
  }, [quality, targetHz, aspectMode, reducedShake]);

  useEffect(() => {
    setSfxVolume(sfxVolume);
    setSfxMuted(sfxMuted);
    setMusicVolume(Math.min(1, sfxVolume * 0.9));
    setMusicMuted(sfxMuted);
  }, [sfxVolume, sfxMuted]);

  useEffect(() => {
    startMenuMusic();
    const id = window.setInterval(() => setTrackTitle(currentTrack().title), 2000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (tab !== "home" && !sessionStorage.getItem("bl-nav-user")) {
      setTab("home");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTab = (t: LauncherTab) => {
    try {
      sessionStorage.setItem("bl-nav-user", "1");
    } catch {
      /* ignore */
    }
    unlockAudio();
    ensureMusicUnlocked();
    setTab(t);
  };

  return (
    <div className="app-shell relative flex h-dvh min-h-[100vh] flex-col overflow-hidden bg-bg text-fg">
      <AmbientStage variant="launcher" />
      {/* Art layers */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-40"
        style={{
          backgroundImage: "url(/ui/bg_battlefield_hd.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          mixBlendMode: "screen",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.22]"
        style={{
          backgroundImage: "url(/ui/bg_command_hd.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          mixBlendMode: "soft-light",
        }}
        aria-hidden
      />

      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-black/55 px-3 py-2 backdrop-blur-md sm:px-5">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-wide text-fg">
            {GAME_TITLE_SHORT}
          </div>
          <div className="truncate text-[0.6rem] text-fg-subtle">{GAME_TITLE}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            title="Skip music track"
            onClick={() => {
              unlockAudio();
              ensureMusicUnlocked();
              skipTrack();
              setTrackTitle(currentTrack().title);
            }}
            className="hidden items-center gap-1.5 rounded-full border border-primary/25 bg-bg-elevated/90 px-2.5 py-1.5 text-[0.65rem] text-fg-muted sm:inline-flex"
          >
            <Music2 className="h-3.5 w-3.5 text-primary" />
            <span className="max-w-[7rem] truncate">{trackTitle}</span>
            <SkipForward className="h-3 w-3" />
          </button>
          <div className="rounded-full border border-primary/30 bg-bg-elevated/90 px-2.5 py-1.5 text-xs font-semibold tabular text-primary">
            Lv {xpProgressInLevel(totalXp).level}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-attack/30 bg-bg-elevated/90 px-2.5 py-1.5 shadow-inner sm:gap-2 sm:px-3">
            <Ticket className="h-4 w-4 text-attack" />
            <span className="text-sm font-semibold tabular text-attack">{tickets}</span>
          </div>
        </div>
      </header>

      {msg && (
        <div className="relative z-10 shrink-0 border-b border-border/60 bg-bg-panel/90 px-4 py-1.5 text-center text-xs text-fg-muted">
          {msg}
        </div>
      )}

      <div className="relative z-10 flex min-h-0 flex-1">
        <nav className="hidden w-48 shrink-0 flex-col gap-1 border-r border-white/10 bg-black/35 p-2 backdrop-blur-sm sm:flex">
          <div
            className="mb-2 overflow-hidden rounded-xl border border-white/10"
            style={{
              backgroundImage: "url(/ui/hero_legion_hd.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center top",
              height: 96,
            }}
          />
          {NAV.map((n) => (
            <NavBtn
              key={n.id}
              active={tab === n.id}
              onClick={() => selectTab(n.id)}
              icon={n.icon}
            >
              {n.label}
            </NavBtn>
          ))}
          <div className="mt-auto rounded-xl border border-white/10 bg-black/40 p-2 text-[0.6rem] text-fg-subtle">
            <div className="mb-1 flex items-center gap-1 font-medium text-primary">
              <Music2 className="h-3 w-3" /> Soundtrack
            </div>
            {MENU_TRACKS.map((t, i) => (
              <div
                key={t.id}
                className={cn(
                  "truncate py-0.5",
                  t.title === trackTitle ? "text-fg" : "text-fg-subtle",
                )}
              >
                {i + 1}. {t.title}
              </div>
            ))}
          </div>
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5">
          {tab === "home" && <HomePanel onNavigate={selectTab} />}
          {tab === "play" && <PlayPanel />}
          {tab === "store" && <StorePanel />}
          {tab === "collection" && <CollectionPanel />}
          {tab === "settings" && <SettingsPanel />}
        </main>
      </div>

      <nav className="relative z-20 grid shrink-0 grid-cols-5 border-t border-white/10 bg-black/60 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => selectTab(n.id)}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[0.58rem] leading-tight",
                tab === n.id ? "text-primary" : "text-fg-subtle",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate">{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function NavBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Home;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
        active
          ? "bg-primary/15 font-semibold text-primary shadow-[inset_0_0_0_1px_rgba(200,208,220,0.2)]"
          : "text-fg-muted hover:bg-white/5 hover:text-fg",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function HomePanel({ onNavigate }: { onNavigate: (t: LauncherTab) => void }) {
  const startGame = useGameStore((s) => s.startGame);
  const continueSavedGame = useGameStore((s) => s.continueSavedGame);
  const clearSavedGame = useGameStore((s) => s.clearSavedGame);
  const phase = useGameStore((s) => s.phase);
  const claim = useMetaStore((s) => s.claimDailyTickets);
  const tickets = useMetaStore((s) => s.tickets);
  const totalXp = useMetaStore((s) => s.totalXp);
  const prog = xpProgressInLevel(totalXp);
  const [hasSave, setHasSave] = useState(false);
  const [saveAge, setSaveAge] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const refreshSave = () => {
    void import("@/game/matchSave").then((m) => {
      const s = m.readMatchSave();
      setHasSave(!!s);
      setSaveAge(s ? m.formatSaveAge(s.savedAt) : null);
    });
  };

  useEffect(() => {
    refreshSave();
    const onVis = () => refreshSave();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [phase]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/15 shadow-2xl">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/ui/bg_battlefield_hd.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:p-8">
          <div
            className="hidden h-36 w-28 shrink-0 overflow-hidden rounded-2xl border border-primary/40 shadow-xl sm:block"
            style={{
              backgroundImage: "url(/ui/hero_legion_hd.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center top",
            }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-3xl">
              {GAME_TITLE}
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-fg-muted">
              High-tech legion combat with medieval physics. Discombobulator beams,
              laser protocols, and transparent combat math.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
              <span className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 font-semibold text-primary">
                Legion Lv {prog.level}
              </span>
              <span className="tabular">
                XP {prog.into}/{prog.need}
              </span>
              <span className="tabular text-attack">{tickets} tickets</span>
            </div>
            <div className="mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-black/50">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${prog.need > 0 ? Math.min(100, (prog.into / prog.need) * 100) : 0}%`,
                }}
              />
            </div>

            {/* Load game — resume from LX_SAVE_GAME (auto-saved on app close) */}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  unlockAudio();
                  playSfx("ui");
                  void import("@/game/matchSave").then(async (m) => {
                    await m.hydrateMatchSaveFromDevice();
                    const exists = m.hasMatchSave();
                    setHasSave(exists);
                    if (!exists) {
                      setStatus(
                        "No saved match yet. Play a match — closing the app auto-saves to LX_SAVE_GAME.",
                      );
                      refreshSave();
                      return;
                    }
                    const ok = continueSavedGame();
                    if (ok) {
                      setStatus(null);
                      setHasSave(false);
                    } else {
                      setStatus("Could not load save — file may be damaged.");
                      refreshSave();
                    }
                  });
                }}
                className={
                  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold sm:max-w-sm " +
                  (hasSave
                    ? "border-primary/50 bg-primary/20 text-primary shadow-[0_0_24px_rgba(200,208,220,0.12)]"
                    : "border-white/20 bg-white/10 text-fg")
                }
              >
                <FolderOpen className="h-4 w-4" />
                Load game
                {hasSave && saveAge ? ` · ${saveAge}` : ""}
              </button>
              <p className="text-[0.65rem] text-fg-subtle">
                Progress auto-saves to device folder LX_SAVE_GAME when the app closes.
              </p>
            </div>
            {hasSave && (
              <button
                type="button"
                onClick={() => {
                  clearSavedGame();
                  setHasSave(false);
                  setSaveAge(null);
                  setStatus("Local save discarded.");
                }}
                className="mt-1 text-left text-[0.65rem] text-fg-subtle underline-offset-2 hover:underline"
              >
                Discard saved match
              </button>
            )}
            {status && (
              <p className="mt-2 text-xs text-fg-muted">{status}</p>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => {
                  unlockAudio();
                  ensureMusicUnlocked();
                  startGame("normal");
                }}
                className="min-h-12 rounded-2xl bg-primary px-7 py-3 text-sm font-semibold text-primary-fg shadow-[0_8px_32px_rgba(200,208,220,0.28)]"
              >
                Launch match
              </button>
              <button
                type="button"
                onClick={() => onNavigate("store")}
                className="min-h-12 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium backdrop-blur"
              >
                Legion store
              </button>
              <button
                type="button"
                onClick={() => claim()}
                className="min-h-12 rounded-2xl border border-attack/40 bg-attack/15 px-5 py-3 text-sm font-medium text-attack"
              >
                Daily rewards
              </button>
              {isWebSite() && (
                <ApkDownloadButton className="w-full sm:w-auto sm:min-w-[14rem]" />
              )}
            </div>
            <p className="mt-3 text-xs text-fg-subtle">
              Build {BUILD_ID} · LX_SAVE_GAME · PIN vault
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            t: "Play",
            d: "Opening hand, laser trades, live math HUD",
            tab: "play" as const,
            img: "/ui/bg_command_hd.jpg",
          },
          {
            t: "Store",
            d: "Dominus Reximus · Spell Power stacks · exclusive units",
            tab: "store" as const,
            img: "/cards/dominus_reximus.jpg",
          },
          {
            t: "Settings",
            d: "Graphics live · battle SFX · PIN vault · music",
            tab: "settings" as const,
            img: "/ui/hero_legion_hd.jpg",
          },
        ].map((c) => (
          <button
            key={c.t}
            type="button"
            onClick={() => onNavigate(c.tab)}
            className="group relative overflow-hidden rounded-2xl border border-white/12 text-left shadow-lg transition hover:border-primary/40"
          >
            <div
              className="absolute inset-0 opacity-50 transition group-hover:opacity-70"
              style={{
                backgroundImage: `url(${c.img})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="relative bg-gradient-to-t from-black/90 via-black/50 to-black/20 p-4 pt-14">
              <div className="text-sm font-semibold text-fg">{c.t}</div>
              <div className="mt-0.5 text-xs text-fg-muted">{c.d}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-bg-panel/80 p-4 backdrop-blur">
        <h2 className="text-sm font-semibold text-fg">Overall Gameplay</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-fg-muted sm:text-sm">
          <li>Spend mana to deploy minions and cast high-tech spells.</li>
          <li>Taunt forces attacks; Immune / Reborn rewrite lethal math.</li>
          <li>
            Drag cards from the fanned hand onto the field; trails show strike
            direction.
          </li>
          <li>Menu score rotates five symphonic tracks from omen to glory.</li>
        </ul>
      </div>
    </div>
  );
}

function PlayPanel() {
  const startGame = useGameStore((s) => s.startGame);
  const continueSavedGame = useGameStore((s) => s.continueSavedGame);
  const clearSavedGame = useGameStore((s) => s.clearSavedGame);
  const deck = useMetaStore((s) => s.deck);
  const owned = useMetaStore((s) => s.owned);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    let alive = true;
    void import("@/game/matchSave").then((m) => {
      if (alive) setHasSave(m.hasMatchSave());
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-4">
      <div
        className="overflow-hidden rounded-2xl border border-white/10"
        style={{
          backgroundImage: "url(/ui/bg_command_hd.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="bg-black/65 p-5 backdrop-blur-sm">
          <h2 className="text-xl font-semibold">Play</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Deck {deck.length} · Owned {owned.length}. Same rules as the Android APK.
          </p>
        </div>
      </div>
      {hasSave && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              ensureMusicUnlocked();
              if (continueSavedGame()) setHasSave(false);
            }}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-success/40 bg-success/15 text-base font-semibold text-success shadow-lg active:scale-[0.99]"
          >
            Load game
          </button>
          <button
            type="button"
            onClick={() => {
              clearSavedGame();
              setHasSave(false);
            }}
            className="w-full text-center text-xs text-fg-subtle underline-offset-2 hover:underline"
          >
            Discard local save
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          unlockAudio();
          ensureMusicUnlocked();
          startGame("normal");
        }}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-fg shadow-lg active:scale-[0.99]"
      >
        <Swords className="h-5 w-5" />
        Ranked practice — Normal
      </button>
      <button
        type="button"
        onClick={() => {
          unlockAudio();
          ensureMusicUnlocked();
          startGame("hard");
        }}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-enemy/40 bg-enemy/10 text-sm font-semibold text-fg active:scale-[0.99]"
      >
        Hard AI
      </button>
    </div>
  );
}

function StorePanel() {
  const tickets = useMetaStore((s) => s.tickets);
  const totalXp = useMetaStore((s) => s.totalXp);
  const owned = useMetaStore((s) => s.owned);
  const buy = useMetaStore((s) => s.buyCard);
  const livePrice = useMetaStore((s) => s.livePrice);
  const level = xpProgressInLevel(totalXp).level;
  const [filter, setFilter] = useState<"all" | "exclusive" | "minion" | "spell">(
    "exclusive",
  );

  const offers = useMemo(
    () =>
      STORE_OFFERS.filter((o) => {
        const c = getCard(o.cardId);
        if (filter === "exclusive") return !!o.exclusive;
        if (filter === "minion") return c.type === "minion";
        if (filter === "spell") return c.type === "spell";
        return true;
      }),
    [filter],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Ticket store</h2>
          <p className="text-sm text-fg-muted">
            High-tech exclusives not in the free starter deck. Spell Power stacks onto
            every damage protocol.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-bg-elevated/90 p-1 backdrop-blur">
          {(["exclusive", "all", "minion", "spell"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs capitalize",
                filter === f ? "bg-primary text-primary-fg" : "text-fg-muted",
              )}
            >
              {f === "minion" ? "units" : f === "spell" ? "protocols" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {offers.map((o) => {
          const c = getCard(o.cardId);
          const have = owned.includes(o.cardId);
          const price = livePrice(o.cardId);
          const locked = level < o.minLevel;
          const can = !have && !locked && tickets >= price;
          return (
            <div
              key={o.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border bg-bg-elevated/90 shadow-lg",
                o.exclusive
                  ? "border-primary/50 shadow-[0_0_28px_rgba(106,154,208,0.15)]"
                  : o.featured
                    ? "border-attack/40"
                    : "border-white/10",
              )}
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <img
                  src={cardArtSrc(c.id)}
                  alt=""
                  className="h-full w-full object-cover object-[center_18%]"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25" />
                <div className="absolute left-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[0.6rem] text-fg">
                  {classLabel(c.art)} · {typeLabel(c.type)}
                </div>
                {o.exclusive && (
                  <div className="absolute right-2 top-2 rounded-md bg-primary px-1.5 py-0.5 text-[0.55rem] font-bold text-primary-fg">
                    {c.id === "dominus_reximus" ? "APEX" : "EXCLUSIVE"}
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="text-sm font-semibold text-white drop-shadow">
                    {c.name}
                  </div>
                  <div className="line-clamp-3 text-[0.65rem] text-white/75">{c.text}</div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 p-2.5">
                <span className="inline-flex items-center gap-1 text-xs font-semibold tabular text-attack">
                  <Ticket className="h-3.5 w-3.5" />
                  {price}
                </span>
                <button
                  type="button"
                  disabled={have || !can}
                  onClick={() => buy(o.cardId)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95",
                    have
                      ? "bg-success/20 text-success"
                      : can
                        ? "bg-primary text-primary-fg"
                        : "bg-bg-subtle text-fg-subtle",
                  )}
                >
                  {have
                    ? "Owned"
                    : locked
                      ? `Lv ${o.minLevel}`
                      : can
                        ? "Buy"
                        : "Need tickets"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CollectionPanel() {
  const owned = useMetaStore((s) => s.owned);
  const deck = useMetaStore((s) => s.deck);
  const add = useMetaStore((s) => s.addToDeck);
  const remove = useMetaStore((s) => s.removeFromDeck);

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-4">
      <h2 className="text-xl font-semibold">Collection & deck</h2>
      <p className="text-sm text-fg-muted">
        Deck {deck.length}/34 · tap card to add (max 2) · use − to remove
      </p>
      <div className="flex flex-wrap gap-2">
        {owned.map((id) => {
          const copies = deck.filter((x) => x === id).length;
          return (
            <div key={id} className="relative">
              <button type="button" onClick={() => add(id)} className="block">
                <CardView defId={id} size="sm" />
              </button>
              <div className="absolute -right-1 -top-1 flex gap-0.5">
                <span className="rounded bg-bg-elevated px-1 text-[0.6rem] font-bold tabular">
                  ×{copies}
                </span>
                {copies > 0 && (
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    className="rounded bg-danger/90 px-1 text-[0.6rem] font-bold text-white"
                  >
                    −
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
