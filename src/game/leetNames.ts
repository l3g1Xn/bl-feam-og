/** Random 1337-style enemy callsigns — picked once per match. */

const ENEMY_LEET_NAMES = [
  "xX_V01D_L0RD_Xx",
  "N30N_R34P3R",
  "PWN_M4CH1N3",
  "H4XX0R_PR1M3",
  "BL00D_C0D3_77",
  "1337_L3G10N",
  "CYB3R_KN1GHT",
  "D4RK_M4TH_G0D",
  "L4S3R_F4NG",
  "G1G4_R41D_B0SS",
  "Z3R0_C00L_X",
  "M3CH4_D3M0N",
  "FR4G_L0RD_420",
  "N0_SK1LL_JUS7_M4TH",
  "UL7R4_V01D",
  "B33P_B00P_K1LL",
  "R4Z0R_W1R3",
  "GL1TCH_K1NG",
  "S1L3NT_PWN",
  "T4CT1C4L_N00B",
  "0V3RCL0CK_X",
  "D1SC0MB0B_3000",
  "L4G_SL4Y3R",
  "H3X_B1T3",
  "CR1MS0N_PKT",
  "W1R3_W0LF",
  "N4N0_N1GHTM4R3",
  "B055_M0D3_ON",
  "K3YB04RD_W4RR10R",
  "SP4M_CL1CK_G0D",
  "V3CTR0R_X9",
  "PH4NT0M_L4G",
  "R0OTK1T_R0N1N",
  "J4GG3D_P1X3L",
  "M3T4_GR1ND3R",
  "S0UL_BUFF3R",
  "T0X1C_M1DN4",
  "BL1TZ_3RR0R",
  "F1R3W4LL_F4C3",
  "D3ATH_P1NG_1",
] as const;

export function randomEnemyLeetName(rng: () => number = Math.random): string {
  const i = Math.floor(rng() * ENEMY_LEET_NAMES.length);
  return ENEMY_LEET_NAMES[i] ?? "1337_3N3MY";
}

/** First letter/digit for avatar chip (skip xX_ prefixes). */
export function leetInitial(name: string): string {
  const cleaned = name.replace(/^x+/i, "").replace(/^[_-]+/, "");
  const ch = cleaned.match(/[A-Za-z0-9]/)?.[0] ?? "?";
  return ch.toUpperCase();
}
