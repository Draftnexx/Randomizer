import type { Rng } from "./rng";
import { nextInt } from "./rng";

const templates = [
  "{option} bleibt als einziges Echo bestehen.",
  "Das Multiversum knickt um {option} herum.",
  "Nur {option} trägt die Last der Ordnung.",
  "{option} ist der stille Kern nach dem Kollaps.",
  "Die Spuren zeigen auf {option}.",
  "{option} hält dem Chaos stand.",
];

export function buildLore(option: string, rng: Rng): string {
  const index = nextInt(rng, templates.length);
  return templates[index].replace("{option}", option);
}
