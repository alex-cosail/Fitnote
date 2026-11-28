import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { catalogTextsFor } from '../../data/catalogTexts';
import { INITIAL_WORKOUTS } from '../../data/seed';
import { resolveExercises } from '../catalog/resolve';
import { applyImport, importedIds } from '../plan/importPlan';
import { draftProfile } from '../profile/profile';
import { archiveImport, archiveOf } from '../schedule/archive';
import { PASTE_LINE, buildAiCoachPrompt } from './aiPrompt';

const exercises = resolveExercises(CATALOG, catalogTextsFor('ru'), {}, [], 'medium');

describe('«Обсудить с моим ИИ-тренером»', () => {
  const profile = { ...draftProfile(), ageGroup: 'masters' as const, trainingMode: 'longevity' as const, personalGoal: 'Подтянуться 5 раз к лету', completedAt: 'x' };
  const prompt = buildAiCoachPrompt({
    profile,
    care: [{ joint: 'knee', level: 2, since: '2026-11-29', source: 'self' }],
    conditions: { longevity: true, care: [{ joint: 'knee', level: 2 }] },
    plans: INITIAL_WORKOUTS.slice(0, 2),
    kind: 'series',
    catalog: CATALOG,
    exercises,
  });

  it('a conversation first, the plan only after «да»', () => {
    expect(prompt).toMatch(/сначала разговор/);
    expect(prompt).toMatch(/Не выдавай план в первом ответе/);
    expect(prompt).toMatch(/Только после моего «да»/);
  });

  it('the AI itself says where to paste the plan: the Sync/Log tab', () => {
    expect(prompt).toContain(PASTE_LINE);
    expect(PASTE_LINE).toMatch(/Sync\/Log/);
  });

  it('carries the person: age, mode, goal, joints', () => {
    expect(prompt).toMatch(/55\+/);
    expect(prompt).toMatch(/Здоровье и восстановление/);
    expect(prompt).toMatch(/Подтянуться 5 раз к лету/);
    expect(prompt).toMatch(/Колено — уровень 2/);
  });

  it('carries the draft and only the exercises available now', () => {
    expect(prompt).toMatch(/"exerciseId": "strict-pull-ups"/); // the draft as it is
    const list = prompt.split('Доступные мне упражнения')[1];
    expect(list).toMatch(/incline-push-ups/);
    expect(list).not.toMatch(/\n\s+bulgarian-split-squat/); // knee at 2 + health mode
    expect(list).not.toMatch(/\n\s+strict-pull-ups/); // no hanging in the health mode
  });
});

describe('any workout: the own words and the day mode', () => {
  it('the request comes first, the day mode is named', () => {
    const p = buildAiCoachPrompt({
      plans: INITIAL_WORKOUTS.slice(0, 1),
      kind: 'single',
      catalog: CATALOG,
      exercises,
      request: 'уровень для акцента оказался выше моего — нужны подводящие',
      dayNote: 'Акцент 20 мин',
    });
    expect(p).toContain('Что я хочу изменить (начни с этого): уровень для акцента оказался выше моего');
    expect(p).toMatch(/Режим дня, в котором я открыл тренировку: Акцент 20 мин/);
    expect(p.indexOf('Что я хочу изменить')).toBeLessThan(p.indexOf('Шаг 1'));
  });
});

describe('the pasted plan goes to the archive', () => {
  const base = { workouts: INITIAL_WORKOUTS, cycles: [], dayOverrides: {}, maxes: {}, customExercises: [] };
  const payload = {
    title: 'Неделя: здоровая спина',
    weeks: 4,
    workouts: [
      { id: 'ai-1', title: 'День 1', subtitle: '', formatLabel: '', rounds: 2, restBetweenExercises: 60, restBetweenRounds: 105, items: [{ exerciseId: 'band-row', target: 12 }] },
      { id: 'ai-2', title: 'День 2', subtitle: '', formatLabel: '', rounds: 2, restBetweenExercises: 60, restBetweenRounds: 105, items: [{ exerciseId: 'box-squats', target: 12 }] },
    ],
  };

  it('several workouts are one series with the AI\x27s title', () => {
    const r = applyImport(base, payload, new Set(CATALOG.map((c) => c.id)), 7);
    const ids = importedIds(payload, 7);
    expect(ids).toEqual(['ai-1', 'ai-2']);
    const a = archiveOf(archiveImport({ ...base, workouts: r.workouts }, ids, payload.title, payload.weeks, 'x'));
    expect(a.find((x) => x.title === 'Неделя: здоровая спина')).toMatchObject({ kind: 'series', planIds: ['ai-1', 'ai-2'], weeks: 4 });
    expect(a.some((x) => x.kind === 'single' && x.planIds[0].startsWith('ai-'))).toBe(false);
  });

  it('one workout is a single', () => {
    const one = { workouts: [payload.workouts[0]] };
    const r = applyImport(base, one, new Set(CATALOG.map((c) => c.id)), 8);
    const a = archiveOf(archiveImport({ ...base, workouts: r.workouts }, importedIds(one, 8), undefined, undefined, 'y'));
    expect(a.find((x) => x.planIds[0] === 'ai-1')).toMatchObject({ kind: 'single', title: 'День 1' });
  });
});
