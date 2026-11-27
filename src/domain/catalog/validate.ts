import { MUSCLE_LABELS } from './muscles';
import { SCENE_KEYS } from '../../data/sceneKeys';
import { REHAB_KEYS } from '../../data/rehabKeys';
import {
  CatalogExercise,
  CatalogText,
  DifficultyRank,
  EnvironmentTag,
  EquipmentTag,
  MOVEMENT_PATTERNS,
  PostureTag,
  StabilityType,
} from './types';

// Single source of the catalog rules: used by the tests (whole catalog) and
// by `npm run catalog:check` (a file of new exercises from the author + AI).

export const ENVIRONMENTS: EnvironmentTag[] = ['outdoor', 'home'];
export const EQUIPMENT: EquipmentTag[] = ['bodyweight', 'pullup_bars', 'suspension', 'bands', 'weights'];
export const POSTURES: PostureTag[] = ['standing', 'hands_only', 'floor_contact'];
export const STABILITY: StabilityType[] = ['bilateral', 'unilateral', 'unstable'];
export const SVG_KEYS = [
  'pullups', 'dips', 'australian_pullups', 'pushups', 'bulgarian_split_squat',
  'glute_bridge', 'side_plank', 'dead_hang', 'pallof_press', 'romanian_deadlift',
  'band_row', 'reverse_lunges', 'pike_pushups', 'generic_strength',
  ...SCENE_KEYS,
  ...REHAB_KEYS,
] as const;

export interface Issue {
  id: string;
  level: 'error' | 'warning';
  message: string;
}

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Checks catalog entries with their Russian texts. `known` are exercises that
 * already exist (ladder links may point at them; ids must not repeat them).
 */
export function validateCatalog(
  entries: CatalogExercise[],
  texts: Record<string, CatalogText>,
  known: CatalogExercise[] = []
): Issue[] {
  const issues: Issue[] = [];
  const err = (id: string, message: string) => issues.push({ id, level: 'error', message });
  const warn = (id: string, message: string) => issues.push({ id, level: 'warning', message });

  const knownIds = new Set(known.map((k) => k.id));
  const all = new Map<string, CatalogExercise>([...known, ...entries].map((c) => [c.id, c]));
  const seen = new Set<string>();

  for (const c of entries) {
    const id = c.id ?? '(без id)';
    if (!c.id || !ID_RE.test(c.id)) err(id, 'id: только латиница в нижнем регистре, цифры и дефисы (например "air-squat")');
    if (seen.has(c.id)) err(id, 'id повторяется в файле');
    if (knownIds.has(c.id)) err(id, 'такой id уже есть в каталоге — придумайте другой');
    seen.add(c.id);

    const text = texts[c.id];
    if (!text?.name?.trim()) err(id, 'нет названия (text.ru.name)');
    if (!text?.cue?.trim()) err(id, 'нет короткой подсказки по технике (text.ru.cue)');
    if (text?.cue && text.cue.length > 140) warn(id, 'подсказка длиннее 140 символов — на площадке её не прочитать');

    if (!MOVEMENT_PATTERNS.includes(c.pattern)) err(id, `pattern должен быть одним из: ${MOVEMENT_PATTERNS.join(', ')}`);
    if (!c.family?.trim()) err(id, 'нет family (семейство лестницы)');
    if (![1, 2, 3, 4, 5].includes(c.rank as DifficultyRank)) err(id, 'rank — число от 1 (--) до 5 (++)');
    if (c.metric !== 'reps' && c.metric !== 'seconds') err(id, 'metric — "reps" или "seconds"');

    const checkList = <T extends string>(name: string, values: T[] | undefined, allowed: T[]) => {
      if (!Array.isArray(values) || values.length === 0) {
        err(id, `${name}: нужен хотя бы один вариант из ${allowed.join(', ')}`);
        return;
      }
      for (const v of values) if (!allowed.includes(v)) err(id, `${name}: неизвестное значение "${v}" (можно: ${allowed.join(', ')})`);
    };
    checkList('environments', c.environments, ENVIRONMENTS);
    checkList('equipment', c.equipment, EQUIPMENT);
    checkList('posture', c.posture, POSTURES);
    if (!STABILITY.includes(c.stability)) err(id, `stability — одно из: ${STABILITY.join(', ')}`);

    if (!Array.isArray(c.targetMuscles) || c.targetMuscles.length === 0) err(id, 'targetMuscles: нужна хотя бы одна мышца');
    if (!Array.isArray(c.antagonistMuscles)) err(id, 'antagonistMuscles: нужен список (можно пустой)');
    for (const m of [...(c.targetMuscles ?? []), ...(c.antagonistMuscles ?? [])]) {
      if (!(m in MUSCLE_LABELS)) warn(id, `мышца "${m}" без русского названия — добавьте её в muscles.ts или используйте существующую`);
    }

    if (!(SVG_KEYS as readonly string[]).includes(c.svgKey)) {
      warn(id, `svgKey "${c.svgKey}" не найден — будет показана универсальная схема (generic_strength)`);
    }

    const dm = c.defaultMax;
    if (!dm || ![dm.low, dm.medium, dm.high].every((v) => typeof v === 'number' && v > 0)) {
      err(id, 'defaultMax: нужны положительные числа low, medium, high');
    } else if (!(dm.low <= dm.medium && dm.medium <= dm.high)) {
      err(id, 'defaultMax: должно быть low ≤ medium ≤ high');
    } else if (c.metric === 'seconds' && dm.medium < 10) {
      warn(id, 'defaultMax для упражнения на время меньше 10 секунд — проверьте единицы');
    }

    for (const [dir, ref] of [['minus1', c.ladder?.minus1], ['plus1', c.ladder?.plus1]] as const) {
      if (!ref) continue;
      const n = all.get(ref);
      if (!n) {
        err(id, `ladder.${dir}: упражнения "${ref}" нет ни в каталоге, ни в файле`);
        continue;
      }
      if (n.family !== c.family) err(id, `ladder.${dir}: "${ref}" из другого семейства (${n.family})`);
      if (dir === 'minus1' && n.rank > c.rank) err(id, `ladder.minus1: "${ref}" сложнее (ранг ${n.rank} > ${c.rank})`);
      if (dir === 'plus1' && n.rank < c.rank) err(id, `ladder.plus1: "${ref}" легче (ранг ${n.rank} < ${c.rank})`);
    }
  }
  return issues;
}
