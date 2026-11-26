import { WorkoutItem, WorkoutPlan } from '../../types';
import { CatalogExercise, DifficultyRank, MOVEMENT_PATTERNS, MovementPattern } from '../catalog/types';
import type { Weekday } from '../schedule/schedule';

// Sharing a workout or a cycle by link and QR (ARCHITECTURE_V3_STEP0 §6,
// decisions 26.11). Only the structure travels: patterns, steps, shares of
// the max — never names, the journal or the sender's maxima. The receiver's
// engine adapts it to their strength, equipment and age.

export type Audience = 'masters' | 'teen' | 'form' | 'challenge' | 'beginner';
export const AUDIENCES: Audience[] = ['beginner', 'form', 'masters', 'teen', 'challenge'];

/** A slot: pattern index, step, catalog index (−1 = by pattern), target ('p30' = 30% of max, 'f12' = fixed 12). */
type SharedSlot = [number, number, number, string];

interface SharedWorkout {
  t: string; // title
  f?: string; // format label
  r: number; // rounds
  re: number; // rest between exercises
  rr: number; // rest between rounds
  s: SharedSlot[];
}

export interface SharePayloadV1 {
  v: 1;
  k: 'w' | 'c'; // one workout or a cycle
  a?: Audience;
  by?: string; // author, typed by the sender
  w: SharedWorkout[];
  d?: Weekday[]; // cycle days
}

export interface ShareMeta {
  audience?: Audience;
  author?: string;
  days?: Weekday[];
}

function slotOf(it: WorkoutItem, catalog: CatalogExercise[]): SharedSlot | undefined {
  const idx = it.exerciseId ? catalog.findIndex((c) => c.id === it.exerciseId) : -1;
  const c = idx >= 0 ? catalog[idx] : undefined;
  const pattern: MovementPattern | undefined = it.pattern ?? c?.pattern;
  if (!pattern) return undefined; // own exercises without a pattern cannot travel
  const rank = it.rank ?? c?.rank ?? 3;
  const target = it.spec?.kind === 'pctMax' ? `p${Math.round(it.spec.pct * 100)}` : `f${it.target}`;
  return [MOVEMENT_PATTERNS.indexOf(pattern), rank, idx, target];
}

export function buildPayload(plans: WorkoutPlan[], catalog: CatalogExercise[], meta: ShareMeta = {}): SharePayloadV1 {
  return {
    v: 1,
    k: plans.length === 1 && !meta.days ? 'w' : 'c',
    ...(meta.audience ? { a: meta.audience } : {}),
    ...(meta.author?.trim() ? { by: meta.author.trim().slice(0, 40) } : {}),
    w: plans.map((p) => ({
      t: p.title.slice(0, 60),
      ...(p.formatLabel ? { f: p.formatLabel.slice(0, 40) } : {}),
      r: p.rounds,
      re: p.restBetweenExercises,
      rr: p.restBetweenRounds,
      s: p.items.map((it) => slotOf(it, catalog)).filter((x): x is SharedSlot => Boolean(x)),
    })),
    ...(meta.days ? { d: meta.days } : {}),
  };
}

/** Plans for the receiver; slots keep the pattern and step, so a missing exercise is picked by pattern. */
export function plansFromPayload(p: SharePayloadV1, catalog: CatalogExercise[], stamp: string): WorkoutPlan[] {
  return p.w.map((w, i) => ({
    id: `shared-${stamp}-${i}`,
    title: w.t,
    subtitle: p.by ? `от ${p.by}` : '',
    formatLabel: w.f ?? '',
    rounds: w.r,
    restBetweenExercises: w.re,
    restBetweenRounds: w.rr,
    items: w.s.map(([pi, rank, ex, target]): WorkoutItem => {
      const c = ex >= 0 ? catalog[ex] : undefined;
      const pattern = MOVEMENT_PATTERNS[pi] ?? c?.pattern ?? 'core';
      const pct = target.startsWith('p') ? Number(target.slice(1)) / 100 : undefined;
      const fixed = target.startsWith('f') ? Number(target.slice(1)) : undefined;
      return {
        ...(c ? { exerciseId: c.id } : {}),
        pattern,
        rank: Math.max(1, Math.min(5, rank)) as DifficultyRank,
        target: fixed ?? 0,
        ...(pct !== undefined ? { spec: { kind: 'pctMax' as const, pct } } : {}),
      };
    }),
  }));
}

// ——— packing: JSON → deflate-raw → base64url ('z…'), or plain base64url ('j…') ———

function toB64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (ch) => ch.charCodeAt(0));
}
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodePayload(p: SharePayloadV1): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(p));
  if (typeof CompressionStream === 'function') {
    try {
      return 'z' + toB64url(await pipe(json, new CompressionStream('deflate-raw')));
    } catch {
      // fall through to plain
    }
  }
  return 'j' + toB64url(json);
}

export async function decodePayload(s: string): Promise<SharePayloadV1 | undefined> {
  try {
    const kind = s[0];
    let bytes = fromB64url(s.slice(1));
    if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    else if (kind !== 'j') return undefined;
    const p = JSON.parse(new TextDecoder().decode(bytes)) as SharePayloadV1;
    if (p.v !== 1 || !Array.isArray(p.w) || p.w.length === 0) return undefined;
    return p;
  } catch {
    return undefined;
  }
}

export function shareUrl(origin: string, encoded: string): string {
  return `${origin}/#/s/${encoded}`;
}
