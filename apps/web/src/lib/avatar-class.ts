const AV = ['av-r', 'av-b', 'av-g', 'av-y', 'av-p', 'av-s', 'av-t', 'av-pi'] as const;

export function avatarClassFromSeed(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AV[h % AV.length]!;
}

export function displayInitial(name: string | null | undefined, fallback: string): string {
  const s = (name || fallback).trim();
  const ch = [...s][0];
  return ch ?? '?';
}
