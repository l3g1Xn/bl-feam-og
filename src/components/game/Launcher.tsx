import { useEffect, useMemo, useState } from "react";
import {
  getLiveOffers,
  useMetaStore,
  xpProgressInLevel,
  type LauncherTab,
} from "@/game/meta";
import { cardArtSrc, classLabel, getCard, typeLabel } from "@/game/cards";
import { rotationLabel, storeWeekKey } from "@/game/storeRotation";
import { configureGraphics } from "@/game/graphics";
import { playSfx, setSfxMuted, setSfxVolume, unlockAudio } from "@/game/audio";
import {
  currentTrack,
  ensureMusicUnlocked,
  MENU_TRACKS,
  setMusicMuted,
  setMusicVolume,
  skipTrack,
  startMenuMusic,
} from "@/game/music";
import { useGameStore } from "@/game/store";
import { APK_VERSION, BUILD_ID, GAME_TITLE, GAME_TITLE_SHORT, TITLE_LOGO_SRC } from "@/game/brand";
import { AmbientStage } from "./AmbientStage";
import { CanvasChrome } from "./CanvasChrome";
import { ApkDownloadButton } from "./ApkDownloadButton";
import { CardView } from "./CardView";
import { SettingsPanel } from "./SettingsPanel";
import { isWebSite } from "@/lib/platform";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import {
  BookOpen,
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
    playSfx("ui");
    setTab(t);
  };

  return (
    <div className="app-shell relative flex h-dvh min-h-[100vh] flex-col overflow-hidden bg-bg text-fg">
      <AmbientStage variant="launcher" />
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-50"
        style={{
          backgroundImage: "url(/ui/bg_battlefield_hd.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          mixBlendMode: "screen",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.32]"
        style={{
          backgroundImage: "url(/ui/bg_command_hd.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          mixBlendMode: "soft-light",
        }}
        aria-hidden
      />

      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="/ui/legixn_icon.png"
            alt=""
            className="h-9 w-9 shrink-0 rounded-lg object-cover legixn-ring"
            width={36}
            height={36}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-wide text-fg">
              {GAME_TITLE_SHORT}
            </div>
            <div className="truncate text-[0.6rem] text-fg-subtle">
              <span className="font-semibold text-accent">LEGIXN</span>
              {" · "}
              {GAME_TITLE}
            </div>
          </div>
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
            <span className="max-w-[8rem] truncate">{trackTitle}</span>
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
          <div className="relative mb-2 h-24 overflow-hidden rounded-xl border border-white/10">
            <CanvasChrome variant="panel" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url(/ui/hero_legion_hd.jpg)",
                backgroundSize: "cover",
                backgroundPosition: "center top",
              }}
            />
          </div>
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
          <div className="relative mt-auto max-h-44 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-2 text-[0.58rem] text-fg-subtle">
            <CanvasChrome variant="panel" />
            <div className="relative z-[1]">
              <div className="mb-1 flex items-center gap-1 font-medium text-primary">
                <Music2 className="h-3 w-3" /> TraX · 2
              </div>
              {MENU_TRACKS.map((tr, i) => (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => {
                    unlockAudio();
                    ensureMusicUnlocked();
                    void import("@/game/music").then((m) => {
                      m.playTrackAt(i);
                      setTrackTitle(m.currentTrack().title);
                    });
                  }}
                  className={
                    tr.title === trackTitle
                      ? "block w-full truncate py-0.5 text-left font-semibold text-fg"
                      : "block w-full truncate py-0.5 text-left text-fg-subtle hover:text-fg"
                  }
                  title={tr.mood}
                >
                  {i + 1}. {tr.title}
                </button>
              ))}
              <div className="mt-1.5 border-t border-white/10 pt-1 font-medium text-primary">
                v{APK_VERSION}
              </div>
            </div>
          </div>
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5">
          {tab === "home" && (
            <HomePanel
              onNavigate={selectTab}
              trackTitle={trackTitle}
              setTrackTitle={setTrackTitle}
            />
          )}
          {tab === "play" && <PlayPanel />}
          {tab === "store" && <StorePanel />}
          {tab === "collection" && <CollectionPanel />}
          {tab === "settings" && (
            <div className="relative mx-auto max-w-lg overflow-hidden rounded-3xl border border-white/10 p-4 sm:p-5">
              <CanvasChrome variant="menu" />
              <div className="relative z-[1]">
                <SettingsPanel />
              </div>
            </div>
          )}
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
          ? "bg-accent/15 font-semibold text-accent shadow-[inset_0_0_0_1px_rgba(255,106,26,0.35)]"
          : "text-fg-muted hover:bg-white/5 hover:text-fg",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function HomePanel({
  onNavigate,
  trackTitle,
  setTrackTitle,
}: {
  onNavigate: (t: LauncherTab) => void;
  trackTitle: string;
  setTrackTitle: (t: string) => void;
}) {
  const startGame = useGameStore((s) => s.startGame);
  const claim = useMetaStore((s) => s.claimDailyTickets);
  const tickets = useMetaStore((s) => s.tickets);
  const totalXp = useMetaStore((s) => s.totalXp);
  const prog = xpProgressInLevel(totalXp);

  const showcase = useMemo(() => {
    const ids = [
      "dominus_reximus",
      "void_sovereign",
      "prism_titan",
      "siege_titan",
      "cataclysm",
      "nova_hex",
      "arc_blade",
      "titan_wrath",
    ];
    const out: ReturnType<typeof getCard>[] = [];
    for (const id of ids) {
      try {
        out.push(getCard(id));
      } catch {
        /* skip missing */
      }
    }
    return out;
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 pb-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/12 shadow-2xl legixn-ring">
        <CanvasChrome variant="hero" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/ui/bg_battlefield_hd.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/35" />
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/20 blur-3xl legixn-pulse" />
        <div className="relative z-[1] flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-8">
          <div className="relative mx-auto flex w-full max-w-md shrink-0 flex-col items-center gap-3 sm:mx-0 sm:max-w-[16rem]">
            <img
              src={TITLE_LOGO_SRC}
              alt={`${GAME_TITLE} v${APK_VERSION}`}
              className="title-logo w-full rounded-xl border border-white/10 shadow-2xl legixn-glow"
              width={560}
              height={374}
              decoding="async"
            />
            <div className="rounded-full border border-accent/50 bg-black/80 px-2.5 py-0.5 text-[0.55rem] font-bold tracking-wider text-accent">
              RELEASE v{APK_VERSION}
            </div>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">
              LEGIXN COMMAND
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg sm:text-3xl">
              {GAME_TITLE}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">
              High-tech legion combat with medieval physics. Discombobulator beams,
              laser protocols, Dominus Reximus exclusives, Wave G store stock, and



              transparent combat math — same build as the Android package.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-fg-muted sm:justify-start">
              <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 font-semibold text-accent">
                Legion Lv {prog.level}
              </span>
              <span className="tabular">
                XP {prog.into}/{prog.need}
              </span>
              <span className="tabular text-attack">{tickets} tickets</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-fg-subtle">
                Legion TraX · 2 suites
              </span>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-primary">
                Store Wave A/B/C/D/E

              </span>
            </div>
            <div className="mx-auto mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-black/50 sm:mx-0">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-attack"
                style={{
                  width: `${prog.need > 0 ? Math.min(100, (prog.into / prog.need) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
              <button
                type="button"
                onClick={() => {
                  unlockAudio();
                  ensureMusicUnlocked();
                  startGame("normal");
                }}
                className="min-h-12 rounded-2xl bg-gradient-to-r from-accent to-attack px-7 py-3 text-sm font-semibold text-primary-fg shadow-[0_8px_32px_rgba(255,106,26,0.35)]"
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
              Build {BUILD_ID} · APK v{APK_VERSION} · Legion TraX soundtrack
            </p>
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-white/10 p-4">
        <CanvasChrome variant="panel" />
        <div className="relative z-[1]">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-fg">Legion roster · live art</h2>
              <p className="text-[0.65rem] text-fg-subtle">
                Same portraits and exclusives as the v{APK_VERSION} APK package
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("collection")}
              className="text-[0.65rem] font-medium text-accent hover:underline"
            >
              Full collection
            </button>
          </div>
          <div className="feat-card-scroll flex gap-3 overflow-x-auto pb-1">
            {showcase.map((c) => (
              <div
                key={c.id}
                className="w-[7.25rem] shrink-0 overflow-hidden rounded-xl border border-white/12 bg-black/40 shadow-lg"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={cardArtSrc(c.id)}
                    alt={c.name}
                    className="card-art h-full w-full"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2 pt-8">
                    <div className="truncate text-[0.65rem] font-semibold text-fg">
                      {c.name}
                    </div>
                    <div className="truncate text-[0.55rem] text-fg-subtle">
                      {typeLabel(c.type)} · {classLabel(c.art)} · {c.cost} mana
                    </div>
                  </div>
                  {c.id === "dominus_reximus" && (
                    <span className="absolute right-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[0.5rem] font-bold text-primary-fg">
                      EX
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            t: "Play",
            d: "Opening hand · laser trades · live math HUD",
            tab: "play" as const,
            img: "/ui/bg_command_hd.jpg",
          },
          {
            t: "Store",
            d: "Dominus Reximus · Spell Power · exclusives",
            tab: "store" as const,
            img: "/cards/dominus_reximus.jpg",
          },
          {
            t: "Settings",
            d: "UltraHD · TraX BGM · combat SFX",
            tab: "settings" as const,
            img: "/ui/hero_legion_hd.jpg",
          },
        ].map((c) => (
          <button
            key={c.t}
            type="button"
            onClick={() => onNavigate(c.tab)}
            className="group relative overflow-hidden rounded-2xl border border-white/12 text-left shadow-lg transition hover:border-accent/50"
          >
            <CanvasChrome variant="panel" />
            <div
              className="absolute inset-0 opacity-55 transition group-hover:opacity-75"
              style={{
                backgroundImage: `url(${c.img})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="relative z-[1] bg-gradient-to-t from-black/95 via-black/55 to-black/15 p-4 pt-16">
              <div className="text-sm font-semibold text-fg">{c.t}</div>
              <div className="mt-0.5 text-xs text-fg-muted">{c.d}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-accent/25 p-4">
        <CanvasChrome variant="panel" />
        <div className="relative z-[1]">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-fg">
            <Music2 className="h-4 w-4 text-accent" />
            Legion TraX soundtrack
          </h2>
          <p className="mb-3 text-[0.65rem] text-fg-subtle">
            Two long-form suites replace the old 10-track set. Tap to play · header Skip
            advances. Battle ducks volume so combat SFX stay clear.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MENU_TRACKS.map((tr, i) => (
              <button
                key={tr.id}
                type="button"
                onClick={() => {
                  unlockAudio();
                  ensureMusicUnlocked();
                  void import("@/game/music").then((m) => {
                    m.playTrackAt(i);
                    setTrackTitle(m.currentTrack().title);
                  });
                }}
                className={
                  tr.title === trackTitle
                    ? "flex items-center gap-2 rounded-xl border border-accent/50 bg-accent/15 px-3 py-2.5 text-left text-[0.75rem] shadow-[0_0_20px_rgba(255,106,26,0.15)]"
                    : "flex items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-left text-[0.75rem] transition hover:border-accent/35 hover:bg-black/50"
                }
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-sm font-bold text-accent">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-fg">{tr.title}</span>
                  <span className="block truncate text-[0.55rem] text-fg-subtle">
                    {tr.mood}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 p-4">
        <CanvasChrome variant="panel" />
        <div className="relative z-[1]">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <BookOpen className="h-4 w-4 text-accent" />
            Overall Gameplay
          </h2>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs text-fg-muted sm:text-sm">
            <li>Spend mana to deploy minions and cast high-tech spell protocols.</li>
            <li>Taunt forces attacks; Immune / Reborn rewrite lethal math live.</li>
            <li>
              Drag cards from the fanned hand onto the field — trails show strike
              direction.
            </li>
            <li>
              Legion TraX Part 1 & 2 score the command shell; battle ducks the volume.
            </li>
            <li>
              School-colored beams, particles, and layered battle SFX — same as APK.
            </li>
          </ul>
        </div>
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
      <div className="relative overflow-hidden rounded-2xl border border-white/10">
        <CanvasChrome variant="menu" />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: "url(/ui/bg_command_hd.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-[1] bg-black/55 p-5 backdrop-blur-sm">
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
  const owned = useMetaStore((s) => s.owned);
  const tickets = useMetaStore((s) => s.tickets);
  const totalXp = useMetaStore((s) => s.totalXp);
  const buy = useMetaStore((s) => s.buyCard);
  const livePrice = useMetaStore((s) => s.livePrice);
  const level = xpProgressInLevel(totalXp).level;
  const [filter, setFilter] = useState<
    "all" | "exclusive" | "deals" | "new" | "minion" | "spell"
  >("deals");
  const week = storeWeekKey();

  const offers = useMemo(() => {
    const all = getLiveOffers(level);
    return all.filter((o) => {
      const c = getCard(o.cardId);
      if (filter === "exclusive") return !!o.exclusive;
      if (filter === "deals") return o.rotationDeal || o.stockWave;
      if (filter === "new") return o.stockWave;
      if (filter === "minion") return c.type === "minion";
      if (filter === "spell") return c.type === "spell";
      return true;
    });
  }, [filter, level]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-4">
      <div className="relative overflow-hidden rounded-2xl border border-accent/25 legixn-ring">
        <CanvasChrome variant="store" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "url(/cards/dominus_reximus.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/50" />
        <div className="relative z-[1] flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-accent">
              LEGIXN armory · {week}
            </p>
            <h2 className="text-xl font-semibold">Ticket store</h2>
            <p className="text-sm text-fg-muted">
              Weekly rotation deals + new stock wave. Prices rebalanced (×2). Spell
              Power stacks onto every damage protocol.
            </p>
            <p className="mt-1 text-xs tabular text-attack">
              {tickets} tickets · Legion Lv {level}
            </p>
            <p className="mt-1 max-w-md text-[0.65rem] text-fg-subtle">
              {rotationLabel(week)}
            </p>
          </div>
          <div className="flex max-w-full flex-wrap gap-1 rounded-xl border border-border bg-bg-elevated/90 p-1 backdrop-blur">
            {(
              [
                "deals",
                "new",
                "exclusive",
                "all",
                "minion",
                "spell",
              ] as const
            ).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "min-h-[36px] rounded-lg px-2.5 py-1.5 text-[0.7rem] capitalize sm:px-3 sm:text-xs",
                  filter === f
                    ? "bg-accent text-primary-fg"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                {f === "minion"
                  ? "units"
                  : f === "spell"
                    ? "protocols"
                    : f === "new"
                      ? "stock"
                      : f}
              </button>
            ))}
          </div>
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
                "relative flex flex-col overflow-hidden rounded-2xl border bg-bg-elevated/90 shadow-lg",
                o.rotationDeal
                  ? "border-success/55 shadow-[0_0_28px_rgba(90,154,110,0.25)]"
                  : o.stockWave
                    ? "border-mana-glow/50 shadow-[0_0_24px_rgba(106,154,208,0.2)]"
                    : o.exclusive
                      ? "border-accent/50 shadow-[0_0_28px_rgba(255,106,26,0.2)]"
                      : o.featured
                        ? "border-attack/40"
                        : "border-white/10",
              )}
            >
              <CanvasChrome variant="store" />
              <div className="relative z-[1] aspect-[3/4] overflow-hidden">
                <img
                  src={cardArtSrc(c.id)}
                  alt=""
                  className="h-full w-full object-cover object-[center_18%]"
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25" />
                <div className="absolute left-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[0.6rem] text-fg">
                  {classLabel(c.art)} · {typeLabel(c.type)}
                </div>
                <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
                  {o.rotationDeal && (
                    <div className="rounded-md bg-success px-1.5 py-0.5 text-[0.55rem] font-bold text-primary-fg">
                      −{o.dealPct}% DEAL
                    </div>
                  )}
                  {o.stockWave && (
                    <div className="rounded-md bg-mana px-1.5 py-0.5 text-[0.55rem] font-bold text-white">
                      NEW STOCK
                    </div>
                  )}
                  {o.exclusive && !o.stockWave && (
                    <div className="rounded-md bg-primary px-1.5 py-0.5 text-[0.55rem] font-bold text-primary-fg">
                      {c.id === "dominus_reximus" ? "APEX" : "EXCLUSIVE"}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="text-sm font-semibold text-white drop-shadow">
                    {c.name}
                  </div>
                  <div className="line-clamp-3 text-[0.65rem] text-white/75">{c.text}</div>
                </div>
              </div>
              <div className="relative z-[1] flex items-center justify-between gap-2 p-2.5">
                <span className="inline-flex items-center gap-1 text-xs font-semibold tabular text-attack">
                  <Ticket className="h-3.5 w-3.5" />
                  {price}
                </span>
                <button
                  type="button"
                  disabled={have || !can}
                  onClick={() => {
                    unlockAudio();
                    buy(o.cardId);
                  }}
                  className={cn(
                    "min-h-[40px] min-w-[4.5rem] rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95",
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
      {offers.length === 0 && (
        <p className="text-center text-sm text-fg-muted">
          No offers in this filter — try All or Exclusive.
        </p>
      )}
    </div>
  );
}

function CollectionPanel() {
  const owned = useMetaStore((s) => s.owned);
  const deck = useMetaStore((s) => s.deck);
  const add = useMetaStore((s) => s.addToDeck);
  const remove = useMetaStore((s) => s.removeFromDeck);

  return (
    <div className="relative mx-auto max-w-4xl space-y-4 overflow-hidden rounded-3xl border border-white/10 p-4 pb-6 sm:p-5">
      <CanvasChrome variant="panel" />
      <div className="relative z-[1] space-y-4">
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
    </div>
  );
}
