export function parseOptions(input: string): string[] {
  const raw = input.split(/[\n,;|]+/);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of raw) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}
