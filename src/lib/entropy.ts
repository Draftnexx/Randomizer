const MIX_A = 0x45d9f3b;
const MIX_B = 0x119de1f3;

function mixSeed(seed: number, value: number): number {
  let mixed = (seed ^ value) >>> 0;
  mixed = Math.imul(mixed, MIX_A) >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, MIX_B) >>> 0;
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

export function buildSeed32(entropy: number[]): number {
  const seedArray = new Uint32Array(1);
  crypto.getRandomValues(seedArray);
  let seed = seedArray[0] >>> 0;

  for (const sample of entropy) {
    seed = mixSeed(seed, sample >>> 0);
  }

  return seed >>> 0;
}
