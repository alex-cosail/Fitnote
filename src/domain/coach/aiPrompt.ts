import type { Exercise, WorkoutPlan } from '../../types';
import type { Care } from '../care/care';
import { JOINT_NAMES, LEVEL_INFO } from '../care/care';
import { Conditions, isAvailable } from '../catalog/filter';
import type { CatalogExercise } from '../catalog/types';
import type { UserProfile } from '../profile/profile';

// «Обсудить с моим ИИ-тренером» (v3.19): a request to paste into any AI
// (ChatGPT, Gemini, Claude). A conversation first, the plan after the
// person's «да» (customer, 26.11), in the app's import format, and at the
// end the AI itself says where to paste it: the Sync/Log tab (29.11).

export interface AiCoachInput {
  profile?: UserProfile;
  care?: Care[];
  conditions?: Conditions;
  /** The draft the person is editing: a single workout or a series. */
  plans: WorkoutPlan[];
  kind: 'single' | 'series';
  catalog: CatalogExercise[];
  exercises: Exercise[];
  /** The person's own words: what to change (v3.19.1). */
  request?: string;
  /** The day mode the workout was opened in, e.g. «Акцент 20 мин». */
  dayNote?: string;
}

const ZONE_RU: Record<string, string> = {
  upper_v: 'верх — вертикаль (подтягивания, жим вверх)',
  upper_h: 'верх — горизонталь (отжимания, тяги)',
  core: 'кор',
  hinge: 'таз и задняя цепь',
  squat: 'ноги — присед',
  lunge: 'ноги — баланс, одна нога',
};
const MARK_RU: Record<string, string> = { base: 'база', plus: 'усилить (+)', plusplus: 'акцент (++)' };
const AGE_RU: Record<string, string> = { teen: 'подросток', adult: 'взрослый', masters: '55+' };
const LEVEL_RU: Record<string, string> = { low: 'начальный', medium: 'средний', high: 'высокий' };

export const PASTE_LINE = 'Скопируйте этот блок и вставьте его в поле ввода на вкладке Sync/Log в Fitnote — план появится в архиве конструктора.';

export function buildAiCoachPrompt(input: AiCoachInput): string {
  const { profile, care = [], conditions, plans, kind, catalog, exercises, request, dayNote } = input;
  const exName = new Map(exercises.map((e) => [e.id, e.name]));

  const person: string[] = [];
  if (profile) {
    person.push(`- Возраст: ${AGE_RU[profile.ageGroup] ?? profile.ageGroup}; уровень: ${LEVEL_RU[profile.level] ?? profile.level}.`);
    person.push(`- Режим: ${profile.trainingMode === 'longevity' ? '«Здоровье и восстановление» — только лёгкие ступени стоя, без висов и упражнений на земле, 2 круга, без тестов до отказа' : '«Спорт и форма»'}.`);
    person.push(`- Тренировок в неделю: ${profile.perWeek >= 4 ? '4+' : profile.perWeek}.`);
    const zones = Object.entries(profile.zones ?? {}).filter(([, m]) => m && m !== 'base');
    person.push(`- Цели по движениям: ${zones.length ? zones.map(([z, m]) => `${ZONE_RU[z] ?? z} — ${MARK_RU[m!] ?? m}`).join('; ') : 'без акцентов, всё ровно'}.`);
    if (profile.personalGoal) person.push(`- Своя цель: ${profile.personalGoal}.`);
    const eq = profile.equipment;
    const gear = [eq.bars && 'турник и брусья', eq.suspension && 'петли', eq.bands && 'резинки', eq.mat && 'коврик', eq.weights && 'гиря или гантели'].filter(Boolean);
    person.push(`- Снаряжение: ${gear.length ? gear.join(', ') : 'только своё тело'}${eq.dirtyFloor ? '; пол грязный — без упражнений лёжа и на коленях' : ''}.`);
  } else {
    person.push('- Анкета не заполнена: спроси возраст, уровень, снаряжение и цели.');
  }
  person.push(
    `- Суставы: ${
      care.length
        ? care.map((c) => `${JOINT_NAMES[c.joint].name} — уровень ${c.level} «${LEVEL_INFO[c.level].name}»`).join('; ')
        : 'ограничений не отмечено'
    }.`
  );

  const draft = {
    workouts: plans.map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle,
      formatLabel: p.formatLabel,
      rounds: p.rounds,
      restBetweenExercises: p.restBetweenExercises,
      restBetweenRounds: p.restBetweenRounds,
      items: p.items.filter((it) => it.exerciseId).map((it) => ({ exerciseId: it.exerciseId, target: it.target })),
    })),
  };

  // Exercises the person can do now, by pattern — the AI picks only from these.
  const available = catalog.filter((c) => isAvailable(c, conditions ?? {}));
  const byPattern = new Map<string, string[]>();
  for (const c of available) byPattern.set(c.pattern, [...(byPattern.get(c.pattern) ?? []), `${c.id} — ${exName.get(c.id) ?? c.id} (ступень ${c.rank})`]);
  const list = [...byPattern.entries()].map(([p, xs]) => `${p}:\n${xs.map((x) => `  ${x}`).join('\n')}`).join('\n');

  return [
    'Ты — мой тренер по функциональным тренировкам (уличная площадка, дом). Работаем как на живой консультации: сначала разговор, план — только после него. Не выдавай план в первом ответе.',
    '',
    ...(request?.trim() ? [`Что я хочу изменить (начни с этого): ${request.trim()}`, ''] : []),
    ...(dayNote ? [`Режим дня, в котором я открыл тренировку: ${dayNote}.`, ''] : []),
    `Шаг 1. Посмотри мой черновик (${kind === 'series' ? 'серия тренировок на неделю' : 'одна тренировка'}) и данные обо мне ниже. Задай 5–7 коротких вопросов и дождись ответов: что болит или ограничивает, что поберечь, что усилить и к какому сроку, сон и самочувствие, сколько времени реально есть, где и с чем тренируюсь, если это расходится с данными.`,
    '',
    'Шаг 2. Коротко, словами: что видишь в черновике, какие риски, что предлагаешь изменить и почему. Спроси, согласен ли я.',
    '',
    'Шаг 3. Только после моего «да» выдай план одним блоком JSON в формате ниже, без пояснений внутри. Бери упражнения только из списка доступных (поле exerciseId — точный id). Цели: повторы или секунды. Если серия — 2–6 тренировок.',
    '',
    `Шаг 4. Сразу после блока JSON напиши мне дословно: «${PASTE_LINE}»`,
    '',
    'Формат ответа в шаге 3:',
    '```json',
    JSON.stringify(
      {
        title: kind === 'series' ? 'Неделя: …' : 'Тренировка: …',
        weeks: kind === 'series' ? 4 : 1,
        workouts: [{ id: 'ai-1', title: '…', subtitle: '…', formatLabel: '…', rounds: 3, restBetweenExercises: 45, restBetweenRounds: 90, items: [{ exerciseId: 'id из списка', target: 10 }] }],
      },
      null,
      2
    ),
    '```',
    '',
    'Обо мне:',
    ...person,
    '',
    'Мой черновик (JSON):',
    '```json',
    JSON.stringify(draft, null, 2),
    '```',
    '',
    'Доступные мне упражнения (по паттернам, id — название):',
    list,
  ].join('\n');
}
