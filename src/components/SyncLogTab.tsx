import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Plus,
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
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);

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
    workoutLogs,
    cardioLogs,
    checkUpHistory: checkUpHistory.slice(0, 30),
  });

  const handleCopyReport = async () => {
    const json = JSON.stringify(buildCoachReport(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopiedReport(true);
      window.setTimeout(() => setCopiedReport(false), 2000);
    } catch {
      // Fallback download if clipboard permission is blocked
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

          {/* JSON Export for Coach */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26]">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
              Экспорт отчёта для тренера
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Копирует Check-Up максимумы, историю силовых и кардио в JSON
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyReport}
                className={`tap-scale flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white transition-colors ${
                  copiedReport ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                }`}
              >
                {copiedReport ? (
                  <>
                    <Check className="h-4 w-4" /> Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Копировать JSON
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="tap-scale flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-[#111827] dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
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
