import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Plus,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CardioLog,
  CardioType,
  CheckUpEntry,
  Exercise,
  WorkoutLog,
  WorkoutPlan,
} from '../types';

interface SyncLogTabProps {
  exercises: Exercise[];
  workouts: WorkoutPlan[];
  workoutLogs: WorkoutLog[];
  cardioLogs: CardioLog[];
  checkUpHistory: CheckUpEntry[];
  onAddCardio: (log: CardioLog) => void;
  onDeleteWorkoutLog: (id: string) => void;
  onDeleteCardioLog: (id: string) => void;
  onImportPlan: (payload: {
    workouts?: WorkoutPlan[];
    exercises?: Exercise[];
  }) => { addedWorkouts: number; addedExercises: number };
}

type PatternGoal = 'build' | 'maintain' | 'deload';
type RequestScope = 'week' | 'single';
type TrainingLocation = 'outdoor' | 'home';

interface MovementPatternItem {
  id: string;
  label: string;
  hint: string;
}

const MOVEMENT_PATTERNS: MovementPatternItem[] = [
  { id: 'squat', label: 'Присед (Squat)', hint: 'квадрицепсы, колени' },
  { id: 'hinge', label: 'Тазовый шарнир (Hinge)', hint: 'задняя цепь, ягодичные' },
  { id: 'lunge', label: 'Выпад (Lunge)', hint: 'одноопорный баланс' },
  { id: 'push_h', label: 'Горизонтальный жим', hint: 'грудь, трицепс' },
  { id: 'push_v', label: 'Вертикальный жим', hint: 'дельты, верх груди' },
  { id: 'pull', label: 'Тяга (верт. и гориз.)', hint: 'спина, бицепс' },
  { id: 'core', label: 'Кор и антиротация', hint: 'стабилизаторы, пресс' },
];

const DEFAULT_PATTERN_GOALS: Record<string, PatternGoal> = {
  squat: 'maintain',
  hinge: 'maintain',
  lunge: 'maintain',
  push_h: 'build',
  push_v: 'maintain',
  pull: 'build',
  core: 'build',
};

const LOCATION_OPTIONS: { id: TrainingLocation; label: string }[] = [
  { id: 'outdoor', label: 'Уличная площадка' },
  { id: 'home', label: 'Дома' },
];

const EQUIPMENT_OPTIONS: {
  id: string;
  label: string;
  locations: TrainingLocation[];
}[] = [
  {
    id: 'pullup_bars',
    label: 'Турник и брусья',
    locations: ['outdoor'],
  },
  {
    id: 'suspension',
    label: 'Подвесные петли / кольца',
    locations: ['outdoor', 'home'],
  },
  {
    id: 'bands',
    label: 'Фитнес-резинки',
    locations: ['outdoor', 'home'],
  },
  {
    id: 'bodyweight',
    label: 'Без инвентаря (пол / коврик)',
    locations: ['outdoor', 'home'],
  },
];

const SAMPLE_IMPORT_JSON = JSON.stringify(
  {
    workouts: [
      {
        id: 'workout-d-outdoor',
        title: 'Workout D (Street)',
        subtitle: 'Уличная площадка: турник + брусья + ноги',
        formatLabel: 'Outdoor Power',
        rounds: 4,
        restBetweenExercises: 40,
        restBetweenRounds: 90,
        items: [
          { exerciseId: 'strict-pull-ups', target: 7 },
          { exerciseId: 'parallel-bar-dips', target: 16 },
          { exerciseId: 'bulgarian-split-squat', target: 16 },
          { exerciseId: 'dead-hang', target: 35 },
        ],
      },
    ],
  },
  null,
  2
);

export const SyncLogTab: React.FC<SyncLogTabProps> = ({
  exercises,
  workouts,
  workoutLogs,
  cardioLogs,
  checkUpHistory,
  onAddCardio,
  onDeleteWorkoutLog,
  onDeleteCardioLog,
  onImportPlan,
}) => {
  // Cardio quick logger
  const [cardioType, setCardioType] = useState<CardioType>('Бег');
  const [cardioDuration, setCardioDuration] = useState('35');
  const [cardioDistance, setCardioDistance] = useState('5.5');
  const [cardioPte, setCardioPte] = useState('');
  const [cardioZ4Z5, setCardioZ4Z5] = useState('');
  const [cardioElevationOrSwolf, setCardioElevationOrSwolf] = useState('');
  const [cardioNote, setCardioNote] = useState('');

  // History expanders
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Export & Import state
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);

  // AI Request Builder state
  const [requestScope, setRequestScope] = useState<RequestScope>('week');
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(3);
  const [targetWorkoutId, setTargetWorkoutId] = useState<string>(
    () => workouts[0]?.id ?? ''
  );
  // Multi-select locations for weekly cycle; single location for 1-day adaptation
  const [weekLocations, setWeekLocations] = useState<TrainingLocation[]>([
    'outdoor',
    'home',
  ]);
  const [singleLocation, setSingleLocation] =
    useState<TrainingLocation>('outdoor');

  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    'pullup_bars',
    'bands',
    'bodyweight',
  ]);
  const [patternGoals, setPatternGoals] = useState<Record<string, PatternGoal>>(
    DEFAULT_PATTERN_GOALS
  );
  const [builderNote, setBuilderNote] = useState('');

  const handleToggleEquipment = (eqId: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eqId) ? prev.filter((item) => item !== eqId) : [...prev, eqId]
    );
  };

  const handleToggleWeekLocation = (loc: TrainingLocation) => {
    setWeekLocations((prev) => {
      if (prev.includes(loc)) {
        // Keep at least one location selected
        return prev.length > 1 ? prev.filter((l) => l !== loc) : prev;
      }
      return [...prev, loc];
    });
  };

  const handleSingleLocationChange = (nextLoc: TrainingLocation) => {
    setSingleLocation(nextLoc);
    if (nextLoc === 'home') {
      setSelectedEquipment((prev) => {
        const filtered = prev.filter((id) => id !== 'pullup_bars');
        return filtered.length > 0 ? filtered : ['bands', 'bodyweight'];
      });
    } else {
      setSelectedEquipment((prev) =>
        prev.includes('pullup_bars') ? prev : ['pullup_bars', ...prev]
      );
    }
  };

  const handleCardioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Math.max(1, parseInt(cardioDuration, 10) || 20);
    const dist = parseFloat(cardioDistance);
    const pteVal = parseFloat(cardioPte.replace(',', '.'));
    const z4z5Val = parseInt(cardioZ4Z5, 10);
    const elevOrSwolfVal = parseInt(cardioElevationOrSwolf, 10);
    const isSwim = cardioType === 'Плавание';

    const entry: CardioLog = {
      id: `cardio-${Date.now()}`,
      date: new Date().toISOString(),
      type: cardioType,
      durationMinutes: mins,
      distanceKm: Number.isFinite(dist) && dist > 0 ? dist : undefined,
      pte: Number.isFinite(pteVal) && pteVal > 0 ? Math.min(5, pteVal) : undefined,
      z4z5Minutes:
        Number.isFinite(z4z5Val) && z4z5Val >= 0 && cardioZ4Z5.trim() !== ''
          ? z4z5Val
          : undefined,
      ascentMeters:
        !isSwim &&
        Number.isFinite(elevOrSwolfVal) &&
        elevOrSwolfVal >= 0 &&
        cardioElevationOrSwolf.trim() !== ''
          ? elevOrSwolfVal
          : undefined,
      swolf:
        isSwim &&
        Number.isFinite(elevOrSwolfVal) &&
        elevOrSwolfVal > 0
          ? elevOrSwolfVal
          : undefined,
      note: cardioNote.trim() || undefined,
    };
    onAddCardio(entry);
    setCardioPte('');
    setCardioZ4Z5('');
    setCardioElevationOrSwolf('');
    setCardioNote('');
  };

  const buildCoachReport = () => ({
    app: 'Fitnote',
    exportedAt: new Date().toISOString(),
    checkUpMaxes: exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      metric: ex.metric,
      checkup_max: ex.checkup_max,
      lastCheckupDate: ex.lastCheckupDate,
    })),
    currentWorkouts: workouts,
    workoutLogs: workoutLogs.slice(0, 20),
    cardioLogs: cardioLogs.slice(0, 20),
    checkUpHistory: checkUpHistory.slice(0, 20),
  });

  const buildCoachPrompt = () => {
    const goalLabels: Record<PatternGoal, string> = {
      build: 'Наращиваем (приоритет, прогрессия)',
      maintain: 'Оставляем как есть (поддержание)',
      deload: 'Разгружаем (больше отдыха / мобилити)',
    };

    const patternsBlock = MOVEMENT_PATTERNS.map(
      (p) => `- ${p.label}: ${goalLabels[patternGoals[p.id] ?? 'maintain']}`
    ).join('\n');

    const visibleEquipOptions =
      requestScope === 'week'
        ? EQUIPMENT_OPTIONS
        : EQUIPMENT_OPTIONS.filter((e) => e.locations.includes(singleLocation));

    const equipLabels =
      selectedEquipment.length > 0
        ? visibleEquipOptions
            .filter((e) => selectedEquipment.includes(e.id))
            .map((e) => e.label)
            .join(', ')
        : 'Без инвентаря (пол / коврик)';

    const selectedPlan =
      workouts.find((w) => w.id === targetWorkoutId) ?? workouts[0];

    const scopeBlock =
      requestScope === 'week'
        ? `Режим: Собрать сбалансированный недельный микроцикл (${sessionsPerWeek} тренировки в неделю, закрывающий 100% из 7 паттернов движения).`
        : `Режим: Разовая адаптация на сегодня (адаптировать план "${
            selectedPlan?.title ?? 'текущую тренировку'
          }" под текущие условия).`;

    const locationLabel =
      requestScope === 'week'
        ? weekLocations
            .map((l) => (l === 'outdoor' ? 'Уличная площадка' : 'Дома'))
            .join(' + ')
        : singleLocation === 'outdoor'
          ? 'Уличная площадка'
          : 'Дома';

    return [
      'Собери тренировочный план для импорта в приложение Fitnote в строгом JSON-формате (`{"workouts": [...], "exercises": [...]}`).',
      'Используй существующие `id` упражнений из `checkUpMaxes`, а если добавляешь новые упражнения под выбранный инвентарь — включи их в массив `exercises` с корректными `id`, `name`, `metric` ("reps" | "seconds"), `checkup_max` и `cue`.',
      '',
      '1. Задача:',
      scopeBlock,
      `Локация: ${locationLabel}`,
      `Доступный инвентарь: ${equipLabels}`,
      builderNote.trim() ? `Комментарий: ${builderNote.trim()}` : null,
      '',
      '2. Цели по 7 паттернам движения:',
      patternsBlock,
      '',
      '3. Актуальные данные и история из Fitnote (JSON):',
      '```json',
      JSON.stringify(buildCoachReport(), null, 2),
      '```',
    ]
      .filter((line) => line !== null)
      .join('\n');
  };

  const handleCopyPrompt = async () => {
    const promptText = buildCoachPrompt();
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      const blob = new Blob([promptText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitnote-prompt-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCopyReport = async () => {
    const json = JSON.stringify(buildCoachReport(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopiedReport(true);
      window.setTimeout(() => setCopiedReport(false), 2000);
    } catch {
      handleDownloadReport();
    }
  };

  const handleDownloadReport = () => {
    const json = JSON.stringify(buildCoachReport(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitnote-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    setImportStatus(null);
    if (!importText.trim()) {
      setImportStatus({
        type: 'err',
        message: 'Вставьте JSON с планом тренировок или упражнениями.',
      });
      return;
    }
    try {
      const parsed = JSON.parse(importText);
      const workoutsInput: WorkoutPlan[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.workouts)
          ? parsed.workouts
          : parsed.title && Array.isArray(parsed.items)
            ? [parsed]
            : [];
      const exercisesInput: Exercise[] = Array.isArray(parsed.exercises)
        ? parsed.exercises
        : [];

      if (workoutsInput.length === 0 && exercisesInput.length === 0) {
        setImportStatus({
          type: 'err',
          message:
            'Не найден массив "workouts" или "exercises" в корректном формате.',
        });
        return;
      }

      const res = onImportPlan({
        workouts: workoutsInput,
        exercises: exercisesInput,
      });
      setImportText('');
      setImportStatus({
        type: 'ok',
        message: `Импортировано планов: ${res.addedWorkouts}, упражнений: ${res.addedExercises}. История тренировок сохранена.`,
      });
    } catch {
      setImportStatus({
        type: 'err',
        message: 'Ошибка синтаксиса JSON. Проверьте запятые и кавычки.',
      });
    }
  };

  // Unified chronological feed of workouts + cardio
  const unifiedFeed = [
    ...workoutLogs.map((w) => ({ kind: 'workout' as const, date: w.date, data: w })),
    ...cardioLogs.map((c) => ({ kind: 'cardio' as const, date: c.date, data: c })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const visibleEquipment =
    requestScope === 'week'
      ? EQUIPMENT_OPTIONS
      : EQUIPMENT_OPTIONS.filter((e) => e.locations.includes(singleLocation));

  return (
    <div className="mx-auto max-w-6xl px-5 pt-5 pb-32 landscape:pb-10 lg:pb-12">
      <div className="border-b border-gray-200 pb-4 dark:border-[#1E293B]">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Журнал активности и обмен с тренером
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
          Sync / Log
        </h1>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Cardio Logger + JSON Export/Import */}
        <div className="space-y-5 lg:col-span-5">
          {/* Quick Cardio Logger */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26]">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
              Лог бега и плавания
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Запишите аэробную сессию в общий журнал
            </p>

            <form onSubmit={handleCardioSubmit} className="mt-3 space-y-3">
              <div className="grid grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-[#1A2333]">
                {(['Бег', 'Плавание', 'Вело', 'Ходьба'] as CardioType[]).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCardioType(t)}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                        cardioType === t
                          ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2C3A52] dark:text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {t}
                    </button>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                    Время (мин)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={cardioDuration}
                    onChange={(e) => setCardioDuration(e.target.value)}
                    className="font-mono-num mt-1 min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-[#111827] focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:focus:border-[#64748B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                    Дистанция (км)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={cardioDistance}
                    onChange={(e) => setCardioDistance(e.target.value)}
                    className="font-mono-num mt-1 min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-[#111827] focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:focus:border-[#64748B]"
                  />
                </div>
              </div>

              {/* Compact 1-row Suunto metrics: PTE · Z4+Z5 · Набор / SWOLF */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block whitespace-nowrap text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                    PTE
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    max={5}
                    value={cardioPte}
                    onChange={(e) => setCardioPte(e.target.value)}
                    placeholder="3.2"
                    className="font-mono-num mt-1 min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-2.5 text-sm font-bold text-[#111827] placeholder:font-normal placeholder:text-gray-400 focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:placeholder:text-gray-500 dark:focus:border-[#64748B]"
                  />
                </div>
                <div>
                  <label className="block whitespace-nowrap text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                    Z4+Z5 (мин)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cardioZ4Z5}
                    onChange={(e) => setCardioZ4Z5(e.target.value)}
                    placeholder="12"
                    className="font-mono-num mt-1 min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-2.5 text-sm font-bold text-[#111827] placeholder:font-normal placeholder:text-gray-400 focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:placeholder:text-gray-500 dark:focus:border-[#64748B]"
                  />
                </div>
                <div>
                  <label className="block whitespace-nowrap text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                    {cardioType === 'Плавание' ? 'SWOLF' : 'Набор (м)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cardioElevationOrSwolf}
                    onChange={(e) => setCardioElevationOrSwolf(e.target.value)}
                    placeholder={cardioType === 'Плавание' ? '38' : '140'}
                    className="font-mono-num mt-1 min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-2.5 text-sm font-bold text-[#111827] placeholder:font-normal placeholder:text-gray-400 focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:placeholder:text-gray-500 dark:focus:border-[#64748B]"
                  />
                </div>
              </div>

              <input
                type="text"
                value={cardioNote}
                onChange={(e) => setCardioNote(e.target.value)}
                placeholder="Пульс / темп / комментарий (необязательно)"
                className="min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-[#111827] placeholder:text-gray-400 focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:placeholder:text-gray-500 dark:focus:border-[#64748B]"
              />

              <button
                type="submit"
                className="tap-scale flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#111827] text-xs font-bold text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]"
              >
                <Plus className="h-4 w-4" />
                Добавить в журнал
              </button>
            </form>
          </section>

          {/* AI Prompt Builder & JSON Export */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                  Экспорт и запрос тренеру
                </h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Сформируйте промпт с целями и инвентарём или выгрузите JSON
                </p>
              </div>
            </div>

            {/* Toggle for AI Request Builder */}
            <button
              type="button"
              onClick={() => setIsBuilderOpen((prev) => !prev)}
              className="tap-scale mt-3 flex min-h-[46px] w-full items-center justify-between rounded-xl border border-gray-300 bg-gray-50 px-3.5 text-xs font-bold text-[#111827] transition-colors hover:bg-gray-100 dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:hover:bg-[#232F44]"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#DC2626] dark:text-[#EF4444]" />
                Конструктор запроса AI (7 паттернов и экип)
              </span>
              {isBuilderOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {isBuilderOpen && (
              <div className="mt-3 space-y-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-[#2A3548] dark:bg-[#0F1520]">
                {/* 1. Scope: Weekly Cycle vs Today's Adaptation */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    1. Формат запроса
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-gray-200/70 p-1 dark:bg-[#1A2333]">
                    <button
                      type="button"
                      onClick={() => setRequestScope('week')}
                      className={`min-h-[38px] rounded-lg px-2 text-xs font-semibold transition-colors ${
                        requestScope === 'week'
                          ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2C3A52] dark:text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Цикл на неделю
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestScope('single')}
                      className={`min-h-[38px] rounded-lg px-2 text-xs font-semibold transition-colors ${
                        requestScope === 'single'
                          ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2C3A52] dark:text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      На сегодня (1 день)
                    </button>
                  </div>

                  {requestScope === 'week' ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-300">
                        Тренировок в неделю:
                      </span>
                      <div className="flex gap-1">
                        {[2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setSessionsPerWeek(num)}
                            className={`font-mono-num min-h-[34px] min-w-[38px] rounded-lg border text-xs font-bold ${
                              sessionsPerWeek === num
                                ? 'border-[#111827] bg-[#111827] text-white dark:border-[#F3F4F6] dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                                : 'border-gray-300 bg-white text-gray-700 dark:border-[#334155] dark:bg-[#1A2333] dark:text-gray-300'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <select
                        value={targetWorkoutId}
                        onChange={(e) => setTargetWorkoutId(e.target.value)}
                        className="min-h-[40px] w-full rounded-xl border border-gray-300 bg-white px-2.5 text-xs font-semibold text-[#111827] focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
                      >
                        {workouts.map((w) => (
                          <option key={w.id} value={w.id}>
                            Адаптировать: {w.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 2. Location & Equipment */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      2. Локация и экипировка
                    </label>
                    {requestScope === 'week' && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        можно выбрать обе
                      </span>
                    )}
                  </div>

                  {requestScope === 'week' ? (
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {LOCATION_OPTIONS.map((loc) => {
                        const active = weekLocations.includes(loc.id);
                        return (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => handleToggleWeekLocation(loc.id)}
                            className={`min-h-[38px] rounded-xl border px-2 text-xs font-semibold transition-colors ${
                              active
                                ? 'border-[#111827] bg-[#111827] text-white dark:border-[#F3F4F6] dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                                : 'border-gray-300 bg-white text-gray-600 dark:border-[#334155] dark:bg-[#1A2333] dark:text-gray-300'
                            }`}
                          >
                            {loc.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-gray-200/70 p-1 dark:bg-[#1A2333]">
                      {LOCATION_OPTIONS.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handleSingleLocationChange(loc.id)}
                          className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                            singleLocation === loc.id
                              ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2C3A52] dark:text-white'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {loc.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {visibleEquipment.map((eq) => {
                      const active = selectedEquipment.includes(eq.id);
                      return (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => handleToggleEquipment(eq.id)}
                          className={`min-h-[34px] rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                            active
                              ? 'border-[#111827] bg-[#111827] text-white dark:border-[#F3F4F6] dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                              : 'border-gray-300 bg-white text-gray-600 dark:border-[#334155] dark:bg-[#1A2333] dark:text-gray-300'
                          }`}
                        >
                          {eq.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. 7 Movement Patterns Matrix */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    3. Цели по 7 паттернам движения
                  </label>
                  <div className="mt-1.5 space-y-2">
                    {MOVEMENT_PATTERNS.map((pattern) => {
                      const current = patternGoals[pattern.id] ?? 'maintain';
                      return (
                        <div
                          key={pattern.id}
                          className="rounded-xl border border-gray-200 bg-white p-2.5 dark:border-[#232E42] dark:bg-[#131A26]"
                        >
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-xs font-bold text-[#111827] dark:text-[#F3F4F6]">
                              {pattern.label}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {pattern.hint}
                            </span>
                          </div>
                          <div className="mt-1.5 grid grid-cols-3 gap-1">
                            {(
                              [
                                { id: 'build', label: 'Наращиваем' },
                                { id: 'maintain', label: 'Оставляем' },
                                { id: 'deload', label: 'Разгружаем' },
                              ] as { id: PatternGoal; label: string }[]
                            ).map((opt) => {
                              const isSelected = current === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() =>
                                    setPatternGoals((prev) => ({
                                      ...prev,
                                      [pattern.id]: opt.id,
                                    }))
                                  }
                                  className={`min-h-[32px] rounded-lg text-[11px] font-semibold transition-colors ${
                                    isSelected
                                      ? opt.id === 'build'
                                        ? 'bg-[#DC2626] text-white'
                                        : opt.id === 'maintain'
                                          ? 'bg-[#111827] text-white dark:bg-[#334155] dark:text-white'
                                          : 'bg-[#16A34A] text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#1A2333] dark:text-gray-400'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Optional note (e.g., rain, new suspension straps, etc.) */}
                <input
                  type="text"
                  value={builderNote}
                  onChange={(e) => setBuilderNote(e.target.value)}
                  placeholder="Повод / нюансы (напр.: идёт дождь, купил петли на турник)"
                  className="min-h-[40px] w-full rounded-xl border border-gray-300 bg-white px-3 text-xs text-[#111827] placeholder:text-gray-400 focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:placeholder:text-gray-500"
                />

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className={`tap-scale flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white transition-colors ${
                    copiedPrompt ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                  }`}
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="h-4 w-4" /> Запрос с JSON скопирован!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Скопировать запрос для AI
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Classic Raw JSON Export buttons */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyReport}
                className={`tap-scale flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-colors ${
                  copiedReport
                    ? 'border-[#16A34A] bg-[#16A34A] text-white'
                    : 'border-gray-300 bg-white text-[#111827] dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]'
                }`}
              >
                {copiedReport ? (
                  <>
                    <Check className="h-4 w-4" /> Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Только JSON
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="tap-scale flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-[#111827] dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
              >
                <Download className="h-4 w-4" />
                Скачать .json
              </button>
            </div>
          </section>

          {/* JSON Import New Plan (Preserves History) */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                Импорт нового плана (JSON)
              </h2>
              <button
                type="button"
                onClick={() => setImportText(SAMPLE_IMPORT_JSON)}
                className="text-xs font-semibold text-[#DC2626] hover:underline dark:text-[#F87171]"
              >
                Вставить пример
              </button>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Добавляет или обновляет планы ({workouts.length} сейчас) без
              затирания истории тренировок и замеров.
            </p>

            <textarea
              rows={5}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"workouts": [{"id": "...", "title": "...", "rounds": 3, "items": [...]}]}'
              className="font-mono-num mt-3 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-xs text-[#111827] placeholder:text-gray-400 focus:border-[#111827] focus:bg-white focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:placeholder:text-gray-500 dark:focus:border-[#64748B]"
            />

            {importStatus && (
              <p
                className={`mt-2 text-xs font-semibold ${
                  importStatus.type === 'ok'
                    ? 'text-[#16A34A] dark:text-[#4ADE80]'
                    : 'text-[#DC2626] dark:text-[#F87171]'
                }`}
              >
                {importStatus.message}
              </p>
            )}

            <button
              type="button"
              onClick={handleImportSubmit}
              className="tap-scale mt-3 flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl border border-gray-900 bg-white text-xs font-bold text-[#111827] hover:bg-gray-50 dark:border-[#475569] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:hover:bg-[#232F44]"
            >
              <Upload className="h-4 w-4" />
              Импортировать план
            </button>
          </section>
        </div>

        {/* Right Column: Activity Feed */}
        <section className="lg:col-span-7">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
              Журнал тренировок ({unifiedFeed.length})
            </h2>
            <span className="font-mono-num text-xs text-gray-500 dark:text-gray-400">
              Силовых: {workoutLogs.length} · Кардио: {cardioLogs.length}
            </span>
          </div>

          {unifiedFeed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-[#2A3548] dark:bg-[#131A26]">
              <p className="text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">
                Записей пока нет
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Завершите тренировку во вкладке Workout или добавьте пробежку /
                заплыв слева.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {unifiedFeed.map((item) => {
                if (item.kind === 'cardio') {
                  const c = item.data;
                  return (
                    <article
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(c.date)}
                        </p>
                        <h3 className="mt-0.5 text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                          {c.type} ·{' '}
                          <span className="font-mono-num">
                            {c.durationMinutes} мин
                          </span>
                          {c.distanceKm ? (
                            <span className="font-mono-num text-[#DC2626] dark:text-[#F87171]">
                              {' '}
                              · {c.distanceKm} км
                            </span>
                          ) : null}
                        </h3>
                        {(c.pte !== undefined ||
                          c.z4z5Minutes !== undefined ||
                          c.ascentMeters !== undefined ||
                          c.swolf !== undefined) && (
                          <p className="font-mono-num mt-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                            {[
                              c.pte !== undefined ? `PTE ${c.pte}` : null,
                              c.z4z5Minutes !== undefined
                                ? `Z4+Z5 ${c.z4z5Minutes} мин`
                                : null,
                              c.ascentMeters !== undefined
                                ? `Набор ${c.ascentMeters} м`
                                : null,
                              c.swolf !== undefined ? `SWOLF ${c.swolf}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                        {c.note && (
                          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                            {c.note}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteCardioLog(c.id)}
                        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-[#DC2626] dark:text-gray-500 dark:hover:bg-[#1E293B] dark:hover:text-[#F87171]"
                        aria-label="Удалить запись кардио"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </article>
                  );
                }

                const w = item.data;
                const isOpen = expandedLogId === w.id;
                const durationMin = Math.max(
                  1,
                  Math.round(w.durationSeconds / 60)
                );

                return (
                  <article
                    key={w.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLogId(isOpen ? null : w.id)
                        }
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatDate(w.date)}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {w.readiness === 'green'
                              ? 'Зелёный'
                              : w.readiness === 'yellow'
                                ? 'Жёлтый'
                                : 'Красный'}
                          </span>
                        </div>
                        <h3 className="mt-0.5 flex items-center gap-1.5 text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                          {w.workoutTitle}
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </h3>
                        <p className="font-mono-num mt-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                          Круги: {w.roundsCompleted}/{w.roundsPlanned} · Подходы:{' '}
                          {w.sets.length} · {durationMin} мин
                        </p>
                        {w.note && (
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                            {w.note}
                          </p>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteWorkoutLog(w.id)}
                        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-[#DC2626] dark:text-gray-500 dark:hover:bg-[#1E293B] dark:hover:text-[#F87171]"
                        aria-label="Удалить запись тренировки"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {isOpen && (
                      <div className="mt-3 divide-y divide-gray-100 border-t border-gray-100 pt-2 dark:divide-[#1E293B] dark:border-[#1E293B]">
                        {w.sets.map((s, idx) => (
                          <div
                            key={`${s.completedAt}-${idx}`}
                            className="flex items-center justify-between py-1.5 text-xs"
                          >
                            <span className="break-words pr-2 text-gray-700 dark:text-gray-300">
                              <span className="font-mono-num mr-1.5 text-gray-400 dark:text-gray-500">
                                R{s.round}
                              </span>
                              {s.exerciseName}
                              {s.swappedFromName && (
                                <span className="text-gray-400 dark:text-gray-500">
                                  {' '}
                                  (вместо {s.swappedFromName})
                                </span>
                              )}
                            </span>
                            <span className="font-mono-num shrink-0 font-semibold text-[#111827] dark:text-[#F3F4F6]">
                              {s.leftActual !== undefined &&
                              s.rightActual !== undefined
                                ? `${s.leftActual}/${s.rightActual}`
                                : s.actual}
                              {s.metric === 'seconds' ? 'с' : 'п'} · RIR {s.rir}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};