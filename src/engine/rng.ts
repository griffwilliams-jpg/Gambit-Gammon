/**
 * Seeded, serialisable gameplay randomness.
 *
 * sfc32 generator with a 128-bit state stored as four uint32 numbers, so the
 * full random state round-trips through JSON. Each gameplay stream (dice now;
 * deck, lamps and forced discards in later stages) is seeded independently
 * from the match seed and the stream name, so consuming one stream never
 * shifts another. Computer-player randomness must never use these streams.
 */

export type RngState = readonly [number, number, number, number];

export type RngStreamName = 'dice';

export type RngStreams = Readonly<Record<RngStreamName, RngState>>;

export function seedStreams(seed: string): RngStreams {
  return { dice: seedStream(seed, 'dice') };
}

export function seedStream(seed: string, stream: string): RngState {
  let state = hashSeed(`${stream}\u0000${seed}`);
  // Discard early outputs, as recommended for sfc32.
  for (let i = 0; i < 12; i++) state = nextUint32(state).state;
  return state;
}

export function nextUint32(state: RngState): { value: number; state: RngState } {
  let [a, b, c, d] = state;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  return { value: t >>> 0, state: [a >>> 0, b >>> 0, c >>> 0, d >>> 0] };
}

/** Uniform integer in [1, sides], using rejection sampling to avoid modulo bias. */
export function rollDie(state: RngState, sides = 6): { value: number; state: RngState } {
  const limit = Math.floor(0x1_0000_0000 / sides) * sides;
  let current = state;
  for (;;) {
    const next = nextUint32(current);
    current = next.state;
    if (next.value < limit) return { value: (next.value % sides) + 1, state: current };
  }
}

/** cyrb128 string hash, producing four 32-bit words. */
function hashSeed(input: string): RngState {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
