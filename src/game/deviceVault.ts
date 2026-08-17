/**
 * Local device PIN vault (no cloud / no account).
 * PIN profile sealed with AES-GCM; mirrored to LX_SAVE_GAME/pin_vault.json on APK.
 */

import { buildStarterDeck, getCard } from "./cards";
import type { GraphicsQuality } from "./graphics";
import { ensureSaveFolder, lxRead, lxWrite, PIN_FILE } from "./lxSave";

const REGISTRY_KEY = "bl-vault-registry-v1";
const ACTIVE_KEY = "bl-vault-active-v1";
const SESSION_UNLOCKED = "bl-vault-session-unlocked";

/** Cap the once-paid matchId ledger so sealed vaults stay bounded. */
const REWARDED_MATCH_CAP = 64;

export type MetaSnapshot = {
  tickets: number;
  totalXp: number;
  owned: string[];
  deck: string[];
  quality: GraphicsQuality;
  targetHz: 30 | 60 | 90 | 120 | 144;
  aspectMode: "auto" | "16:9";
  reducedShake: boolean;
  sfxVolume: number;
  sfxMuted: boolean;
  /** Once-paid matchIds — optional so pre-1.0.7 vaults still unseal. */
  rewardedMatchIds?: string[];
};

export type VaultProfile = {
  id: string;
  displayName: string;
  credentialIdB64: string;
  sealed: string;
  saltB64: string;
  pinOnly: boolean;
  pinHash?: string;
  createdAt: number;
  updatedAt: number;
};

export type VaultRegistry = {
  enabled: boolean;
  requireOnLaunch: boolean;
  profiles: VaultProfile[];
  activeProfileId: string | null;
};

function b64(u8: ArrayBuffer | Uint8Array): string {
  const bytes = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function safeInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/** Trim, unique, cap 64. Never invents ids. */
export function sanitizeRewardedMatchIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.slice(-REWARDED_MATCH_CAP);
}

export function defaultSnapshot(): MetaSnapshot {
  return {
    tickets: 220,
    totalXp: 0,
    owned: [...new Set(buildStarterDeck())],
    deck: buildStarterDeck(),
    quality: "high",
    targetHz: 60,
    aspectMode: "auto",
    reducedShake: false,
    sfxVolume: 0.75,
    sfxMuted: false,
    rewardedMatchIds: [],
  };
}

export function sanitizeSnapshot(raw: Partial<MetaSnapshot> | null | undefined): MetaSnapshot {
  const d = defaultSnapshot();
  const p = raw ?? {};
  const owned = Array.isArray(p.owned)
    ? p.owned.filter((id) => {
        try {
          return !!getCard(id);
        } catch {
          return false;
        }
      })
    : d.owned;
  const deck = Array.isArray(p.deck)
    ? p.deck.filter((id) => owned.includes(id) || d.owned.includes(id))
    : d.deck;
  const hz = p.targetHz;
  const targetHz: MetaSnapshot["targetHz"] =
    hz === 30 || hz === 60 || hz === 90 || hz === 120 || hz === 144 ? hz : 60;
  return {
    tickets: safeInt(Number(p.tickets ?? d.tickets), 0, 9_999_999, d.tickets),
    totalXp: safeInt(Number(p.totalXp ?? 0), 0, 50_000_000, 0),
    owned: owned.length ? owned : d.owned,
    deck: deck.length >= 20 ? deck : d.deck,
    quality:
      p.quality === "low" ||
      p.quality === "medium" ||
      p.quality === "high" ||
      p.quality === "ultra"
        ? p.quality
        : d.quality,
    targetHz,
    aspectMode: p.aspectMode === "16:9" ? "16:9" : "auto",
    reducedShake: !!p.reducedShake,
    sfxVolume:
      typeof p.sfxVolume === "number" && Number.isFinite(p.sfxVolume)
        ? Math.max(0, Math.min(1, p.sfxVolume))
        : d.sfxVolume,
    sfxMuted: !!p.sfxMuted,
    rewardedMatchIds: sanitizeRewardedMatchIds(p.rewardedMatchIds),
  };
}

export function getRpId(): string {
  if (typeof window === "undefined") return "localhost";
  const h = window.location.hostname;
  if (!h || h === "127.0.0.1") return "localhost";
  return h;
}

export function webAuthnAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof navigator.credentials?.create === "function"
  );
}

export async function platformAuthAvailable(): Promise<boolean> {
  if (!webAuthnAvailable()) return false;
  try {
    if (
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      "function"
    ) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    /* ignore */
  }
  return webAuthnAvailable();
}

export function loadRegistry(): VaultRegistry {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) {
      return { enabled: false, requireOnLaunch: true, profiles: [], activeProfileId: null };
    }
    const p = JSON.parse(raw) as Partial<VaultRegistry>;
    const active =
      typeof p.activeProfileId === "string"
        ? p.activeProfileId
        : localStorage.getItem(ACTIVE_KEY);
    return {
      enabled: !!p.enabled && Array.isArray(p.profiles) && p.profiles.length > 0,
      requireOnLaunch: p.requireOnLaunch !== false,
      profiles: Array.isArray(p.profiles) ? (p.profiles as VaultProfile[]) : [],
      activeProfileId: active || null,
    };
  } catch {
    return { enabled: false, requireOnLaunch: true, profiles: [], activeProfileId: null };
  }
}

export function saveRegistry(reg: VaultRegistry) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  if (reg.activeProfileId) localStorage.setItem(ACTIVE_KEY, reg.activeProfileId);
  void persistPinVaultToDevice(reg);
}

/** Write PIN vault JSON into LX_SAVE_GAME (and web mirror). */
export async function persistPinVaultToDevice(reg?: VaultRegistry): Promise<void> {
  try {
    const r = reg ?? loadRegistry();
    await ensureSaveFolder();
    await lxWrite(
      PIN_FILE,
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        registry: r,
      }),
    );
  } catch (e) {
    console.warn("[vault] persist pin", e);
  }
}

/** Load PIN vault from LX_SAVE_GAME if local registry empty/stale. */
export async function hydratePinVaultFromDevice(): Promise<boolean> {
  try {
    await ensureSaveFolder();
    const raw = await lxRead(PIN_FILE);
    if (!raw) return loadRegistry().enabled;
    const parsed = JSON.parse(raw) as { registry?: VaultRegistry };
    if (!parsed.registry || !Array.isArray(parsed.registry.profiles)) return false;
    if (parsed.registry.profiles.length === 0) return false;
    // Prefer device file when requireOnLaunch pin profiles exist
    const reg: VaultRegistry = {
      enabled: !!parsed.registry.enabled && parsed.registry.profiles.length > 0,
      requireOnLaunch: true,
      profiles: parsed.registry.profiles,
      activeProfileId: parsed.registry.activeProfileId ?? parsed.registry.profiles[0]?.id ?? null,
    };
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
    if (reg.activeProfileId) localStorage.setItem(ACTIVE_KEY, reg.activeProfileId);
    return reg.enabled;
  } catch {
    return loadRegistry().enabled;
  }
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deriveKey(material: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    material.buffer as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 120_000,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function sealSnapshot(
  snap: MetaSnapshot,
  keyMaterial: Uint8Array,
  salt: Uint8Array,
): Promise<string> {
  const key = await deriveKey(keyMaterial, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(snap));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const out = new Uint8Array(iv.length + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), iv.length);
  return b64(out);
}

export async function unsealSnapshot(
  sealed: string,
  keyMaterial: Uint8Array,
  salt: Uint8Array,
): Promise<MetaSnapshot> {
  const raw = fromB64(sealed);
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const key = await deriveKey(keyMaterial, salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  const json = JSON.parse(new TextDecoder().decode(plain)) as Partial<MetaSnapshot>;
  return sanitizeSnapshot(json);
}

function keyMaterialFromCredential(credId: Uint8Array): Uint8Array {
  const tag = new TextEncoder().encode("BattleLegionsVault.v1");
  const out = new Uint8Array(credId.length + tag.length);
  out.set(credId, 0);
  out.set(tag, credId.length);
  return out;
}

async function pinMaterial(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const pinBytes = new TextEncoder().encode(pin.normalize("NFKC"));
  const mix = new Uint8Array(pinBytes.length + salt.length);
  mix.set(pinBytes, 0);
  mix.set(salt, pinBytes.length);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", mix));
}

export function isSessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_UNLOCKED) === "1";
  } catch {
    return false;
  }
}

export function setSessionUnlocked(on: boolean) {
  try {
    if (on) sessionStorage.setItem(SESSION_UNLOCKED, "1");
    else sessionStorage.removeItem(SESSION_UNLOCKED);
  } catch {
    /* ignore */
  }
}

export function needsUnlock(): boolean {
  const reg = loadRegistry();
  if (!reg.enabled || reg.profiles.length === 0) return false;
  // Always require PIN after cold start / lock — requireOnLaunch forced on for PIN vaults
  const pinProfile = reg.profiles.some((p) => p.pinOnly || !!p.pinHash);
  if (!pinProfile && !reg.requireOnLaunch) return false;
  return !isSessionUnlocked();
}

let memoryKeyMaterial: Uint8Array | null = null;
let memoryProfileId: string | null = null;

export function getUnlockedProfileId(): string | null {
  return memoryProfileId;
}

export function isVaultReady(): boolean {
  return !!memoryKeyMaterial && !!memoryProfileId;
}

export async function enrollPasskey(opts: {
  displayName: string;
  snapshot: MetaSnapshot;
}): Promise<{ ok: true; profileId: string } | { ok: false; error: string }> {
  if (!webAuthnAvailable()) {
    return { ok: false, error: "Passkeys not supported on this device." };
  }
  const name = opts.displayName.trim().slice(0, 32) || "Legionnaire";
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Battle Legions", id: getRpId() },
        user: {
          id: userId,
          name: `legion-${b64(userId).slice(0, 12)}`,
          displayName: name,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          requireResidentKey: false,
          userVerification: "required",
        },
        timeout: 90_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!cred) return { ok: false, error: "Passkey creation cancelled." };

    const rawId = new Uint8Array(cred.rawId);
    const material = keyMaterialFromCredential(rawId);
    const sealed = await sealSnapshot(sanitizeSnapshot(opts.snapshot), material, salt);
    const profile: VaultProfile = {
      id: b64(userId).replace(/=+$/, ""),
      displayName: name,
      credentialIdB64: b64(rawId),
      sealed,
      saltB64: b64(salt),
      pinOnly: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const reg = loadRegistry();
    reg.profiles = [...reg.profiles.filter((p) => p.id !== profile.id), profile];
    reg.enabled = true;
    reg.requireOnLaunch = true;
    reg.activeProfileId = profile.id;
    saveRegistry(reg);

    memoryKeyMaterial = material;
    memoryProfileId = profile.id;
    setSessionUnlocked(true);
    return { ok: true, profileId: profile.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Passkey failed";
    return { ok: false, error: msg };
  }
}

export async function enrollPin(opts: {
  displayName: string;
  pin: string;
  snapshot: MetaSnapshot;
}): Promise<{ ok: true; profileId: string } | { ok: false; error: string }> {
  const pin = opts.pin.replace(/\D/g, "");
  if (pin.length < 4 || pin.length > 8) {
    return { ok: false, error: "PIN must be 4–8 digits." };
  }
  const name = opts.displayName.trim().slice(0, 32) || "Legionnaire";
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const material = await pinMaterial(pin, salt);
  const sealed = await sealSnapshot(sanitizeSnapshot(opts.snapshot), material, salt);
  const pinHash = await sha256Hex(`${pin}:${b64(salt)}`);
  const profile: VaultProfile = {
    id: b64(userId).replace(/=+$/, ""),
    displayName: name,
    credentialIdB64: "",
    sealed,
    saltB64: b64(salt),
    pinOnly: true,
    pinHash,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const reg = loadRegistry();
  reg.profiles = [...reg.profiles.filter((p) => p.id !== profile.id), profile];
  reg.enabled = true;
  reg.requireOnLaunch = true;
  reg.activeProfileId = profile.id;
  saveRegistry(reg);
  memoryKeyMaterial = material;
  memoryProfileId = profile.id;
  setSessionUnlocked(true);
  return { ok: true, profileId: profile.id };
}

export async function unlockWithPasskey(
  profileId?: string,
): Promise<
  { ok: true; snapshot: MetaSnapshot; profileId: string } | { ok: false; error: string }
> {
  const reg = loadRegistry();
  const profile =
    reg.profiles.find((p) => p.id === (profileId || reg.activeProfileId)) ||
    reg.profiles.find((p) => !p.pinOnly) ||
    reg.profiles[0];
  if (!profile) return { ok: false, error: "No local profile." };
  if (profile.pinOnly) return { ok: false, error: "This profile uses a PIN." };
  if (!webAuthnAvailable()) return { ok: false, error: "Passkeys unavailable." };

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credId = fromB64(profile.credentialIdB64);
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: getRpId(),
        allowCredentials: [
          {
            id: credId.buffer as ArrayBuffer,
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 90_000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) return { ok: false, error: "Unlock cancelled." };

    const rawId = new Uint8Array(assertion.rawId);
    const salt = fromB64(profile.saltB64);
    const material = keyMaterialFromCredential(rawId);
    try {
      const snap = await unsealSnapshot(profile.sealed, material, salt);
      memoryKeyMaterial = material;
      memoryProfileId = profile.id;
      reg.activeProfileId = profile.id;
      saveRegistry(reg);
      setSessionUnlocked(true);
      return { ok: true, snapshot: snap, profileId: profile.id };
    } catch {
      return { ok: false, error: "Could not open vault." };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Biometric unlock failed";
    return { ok: false, error: msg };
  }
}

export async function unlockWithPin(
  pin: string,
  profileId?: string,
): Promise<
  { ok: true; snapshot: MetaSnapshot; profileId: string } | { ok: false; error: string }
> {
  const reg = loadRegistry();
  const profile =
    reg.profiles.find((p) => p.id === (profileId || reg.activeProfileId)) ||
    reg.profiles.find((p) => p.pinOnly) ||
    reg.profiles[0];
  if (!profile) return { ok: false, error: "No local profile." };

  const clean = pin.replace(/\D/g, "");
  if (clean.length < 4) return { ok: false, error: "Enter your PIN." };

  const salt = fromB64(profile.saltB64);
  if (profile.pinHash) {
    const h = await sha256Hex(`${clean}:${b64(salt)}`);
    if (h !== profile.pinHash) return { ok: false, error: "Incorrect PIN." };
  }
  const material = await pinMaterial(clean, salt);
  try {
    const snap = await unsealSnapshot(profile.sealed, material, salt);
    memoryKeyMaterial = material;
    memoryProfileId = profile.id;
    reg.activeProfileId = profile.id;
    saveRegistry(reg);
    setSessionUnlocked(true);
    return { ok: true, snapshot: snap, profileId: profile.id };
  } catch {
    return { ok: false, error: "Incorrect PIN or corrupted vault." };
  }
}

export async function persistUnlockedSnapshot(snapshot: MetaSnapshot): Promise<boolean> {
  if (!memoryKeyMaterial || !memoryProfileId) return false;
  const reg = loadRegistry();
  const idx = reg.profiles.findIndex((p) => p.id === memoryProfileId);
  if (idx < 0) return false;
  const profile = reg.profiles[idx]!;
  const salt = fromB64(profile.saltB64);
  try {
    const sealed = await sealSnapshot(sanitizeSnapshot(snapshot), memoryKeyMaterial, salt);
    reg.profiles[idx] = { ...profile, sealed, updatedAt: Date.now() };
    saveRegistry(reg);
    return true;
  } catch {
    return false;
  }
}

export function lockSession() {
  memoryKeyMaterial = null;
  memoryProfileId = null;
  setSessionUnlocked(false);
  try {
    sessionStorage.removeItem(SESSION_UNLOCKED);
  } catch {
    /* ignore */
  }
}

export function disableVault() {
  lockSession();
  saveRegistry({
    enabled: false,
    requireOnLaunch: true,
    profiles: [],
    activeProfileId: null,
  });
}

export function setRequireOnLaunch(v: boolean) {
  const reg = loadRegistry();
  reg.requireOnLaunch = v;
  saveRegistry(reg);
}
