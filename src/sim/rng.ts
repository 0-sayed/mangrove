import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";

export interface SeededRng {
  readonly nextInt: () => number;
}

export function createSeededRng(seed: number): SeededRng {
  const generator = xoroshiro128plus(seed);

  return {
    nextInt: () => generator.next()
  };
}
