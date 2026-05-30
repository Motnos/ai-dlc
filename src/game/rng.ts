export interface Rng {
  next(): number;                       // float in [0, 1)
  int(maxExclusive: number): number;    // integer in [0, maxExclusive)
}

export function createRng(seed: number): Rng {
  // mulberry32 — 32-bit state in closure
  let state = seed >>> 0; // coerce to uint32

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    z = ((z ^ (z >>> 14)) >>> 0);
    return z / 4294967296;
  }

  function int(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(next() * maxExclusive);
  }

  return { next, int };
}
