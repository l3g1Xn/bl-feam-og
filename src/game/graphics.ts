/**
 * Graphics adapter for Battle Legions — real-time quality switches.
 * Uses Chromium WebView compositor + ANGLE (not a kernel GPU driver).
 */

export type GpuTier = "high" | "mid" | "low" | "unknown";
export type GraphicsQuality = "low" | "medium" | "high" | "ultra";

export interface GraphicsProfile {
  tier: GpuTier;
  quality: GraphicsQuality;
  maxDpr: number;
  particleBudget: number;
  enableBlur: boolean;
  enableShake: boolean;
  targetFps: number;
  targetHz: number;
  aspectMode: "auto" | "16:9";
  renderer: "css-compositor" | "canvas2d";
  vendorHint: string;
  ambientDepth: boolean;
  fxScale: number;
  battleDetail: number;
  sparklines: boolean;
  rimLight: boolean;
}

function detectWebGlVendor(): string {
  try {
    const c = document.createElement("canvas");
    const gl =
      (c.getContext("webgl2") as WebGL2RenderingContext | null) ||
      (c.getContext("webgl") as WebGLRenderingContext | null);
    if (!gl) return "none";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (ext) {
      return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "webgl");
    }
    return "webgl";
  } catch {
    return "unknown";
  }
}

function tierFromVendor(v: string): GpuTier {
  const s = v.toLowerCase();
  if (!s || s === "none" || s === "unknown") return "unknown";
  /* Adreno peak (6xx/7xx/8xx) + peers → high tier for max DPR/FX */
  if (
    /adreno \(tm\) (6|7|8)|adreno 7|adreno 6|mali-g7|mali-g8|xclipse|apple gpu|nvidia|radeon|geforce|intel.*iris/.test(
      s,
    )
  ) {
    return "high";
  }
  if (/adreno|mali|powervr|immortalis|xclipse|apple/.test(s)) return "mid";
  return "low";
}

let cached: GraphicsProfile | null = null;
let userQuality: GraphicsQuality = "high"; // Adreno-first default
let userHz = 60;
let userAspect: "auto" | "16:9" = "auto";
let userReducedShake = false;
const listeners = new Set<(p: GraphicsProfile) => void>();

export function subscribeGraphics(fn: (p: GraphicsProfile) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(p: GraphicsProfile) {
  for (const fn of listeners) {
    try {
      fn(p);
    } catch {
      /* ignore */
    }
  }
}

export function configureGraphics(opts: {
  quality?: GraphicsQuality;
  targetHz?: number;
  aspectMode?: "auto" | "16:9";
  reducedShake?: boolean;
}) {
  if (opts.quality) userQuality = opts.quality;
  if (opts.targetHz) userHz = opts.targetHz;
  if (opts.aspectMode) userAspect = opts.aspectMode;
  if (opts.reducedShake != null) userReducedShake = opts.reducedShake;
  cached = null;
  const p = getGraphicsProfile();
  applyDocumentProfile(p);
  notify(p);
  return p;
}

export function applyDocumentProfile(p: GraphicsProfile) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.quality = p.quality;
  root.dataset.gpuTier = p.tier;
  root.style.setProperty("--target-fps", String(p.targetFps));
  root.style.setProperty("--fx-scale", String(p.fxScale));
  root.style.setProperty("--battle-detail", String(p.battleDetail));
  root.style.setProperty(
    "--gfx-blur",
    p.enableBlur ? `${Math.round(8 * p.fxScale)}px` : "0px",
  );
  root.classList.toggle("aspect-cinema", p.aspectMode === "16:9");
  root.classList.toggle("gfx-low", p.quality === "low");
  root.classList.toggle("gfx-medium", p.quality === "medium");
  root.classList.toggle("gfx-high", p.quality === "high");
  root.classList.toggle("gfx-ultra", p.quality === "ultra");
  root.classList.toggle("gfx-blur", p.enableBlur);
  root.classList.toggle("gfx-rim", p.rimLight);
}

export function getGraphicsProfile(): GraphicsProfile {
  if (cached) return cached;
  if (typeof window === "undefined") {
    cached = {
      tier: "mid",
      quality: userQuality,
      maxDpr: 2,
      particleBudget: 24,
      enableBlur: true,
      enableShake: true,
      targetFps: 60,
      targetHz: 60,
      aspectMode: "auto",
      renderer: "css-compositor",
      vendorHint: "ssr",
      ambientDepth: true,
      fxScale: 1,
      battleDetail: 1,
      sparklines: true,
      rimLight: true,
    };
    return cached;
  }

  const vendor = detectWebGlVendor();
  const tier = tierFromVendor(vendor);
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const reduced =
    userReducedShake || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let targetFps = Math.min(userHz, 144);
  if (userQuality === "low") targetFps = Math.min(targetFps, 30);
  if (userQuality === "medium") targetFps = Math.min(targetFps, 60);
  if (userQuality === "high") targetFps = Math.min(targetFps, 90);
  if (userQuality === "ultra") targetFps = Math.min(userHz, 144);

  if (tier === "low" || mem <= 2 || cores <= 4) {
    if (userQuality !== "ultra") {
      targetFps = Math.min(targetFps, 60);
    }
  }

  const q = userQuality;
  cached = {
    tier,
    quality: q,
    maxDpr:
      q === "ultra"
        ? Math.min(window.devicePixelRatio || 1, 3)
        : q === "high"
          ? Math.min(window.devicePixelRatio || 1, 2.5)
          : Math.min(window.devicePixelRatio || 1, 1.5),
    particleBudget: q === "ultra" ? 96 : q === "high" ? 56 : q === "medium" ? 28 : 12,
    enableBlur: q !== "low" && !reduced,
    enableShake: !reduced && q !== "low",
    targetFps,
    targetHz: userHz,
    aspectMode: userAspect,
    renderer: "css-compositor",
    vendorHint: vendor,
    ambientDepth: q !== "low",
    fxScale: q === "low" ? 0.55 : q === "medium" ? 0.85 : q === "high" ? 1.05 : 1.25,
    battleDetail: q === "low" ? 0.4 : q === "medium" ? 0.75 : q === "high" ? 1 : 1.35,
    sparklines: q === "high" || q === "ultra",
    rimLight: q !== "low",
  };
  return cached;
}

export function promoteLayer(el: HTMLElement | null, on: boolean) {
  if (!el) return;
  el.style.willChange = on ? "transform, opacity" : "auto";
}
