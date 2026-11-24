import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { findAntagonistMatches } from '../domain/catalog/antagonists';
import { MUSCLE_LABELS, getMuscleLabel } from '../domain/catalog/muscles';
import { formatMetricTarget as formatMetricShort } from '../domain/format';
import { Exercise, MetricType, SvgKey } from '../types';
import { ExerciseSvg } from './ExerciseSvg';

interface CatalogTabProps {
  exercises: Exercise[];
  onAddExercise: (exercise: Exercise) => void;
}

const SVG_PRESETS: { key: SvgKey; label: string }[] = [
  { key: 'generic_strength', label: 'Универсальная схема' },
  { key: 'pullups', label: 'Турник / Подтягивания' },
  { key: 'dips', label: 'Брусья / Отжимания' },
  { key: 'pushups', label: 'Пол / Отжимания' },
  { key: 'bulgarian_split_squat', label: 'Выпады / Приседания' },
  { key: 'glute_bridge', label: 'Мост / Тазовый подъём' },
  { key: 'side_plank', label: 'Планка / Кор' },
  { key: 'band_row', label: 'Резина / Тяга' },
];

export const CatalogTab: React.FC<CatalogTabProps> = ({
  exercises,
  onAddExercise,
}) => {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [antagonistSource, setAntagonistSource] = useState<Exercise | null>(
    null
  );
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for adding custom exercise
  const [newName, setNewName] = useState('');
  const [newMetric, setNewMetric] = useState<MetricType>('reps');
  const [newMax, setNewMax] = useState('15');
  const [newCue, setNewCue] = useState('');
  const [newSvgKey, setNewSvgKey] = useState<SvgKey>('generic_strength');
  const [newIsPaired, setNewIsPaired] = useState(false);
  const [newTargets, setNewTargets] = useState<string[]>(['chest']);
  const [newAntagonists, setNewAntagonists] = useState<string[]>(['upper_back']);
  const [formError, setFormError] = useState('');

  const filterChips = [
    { id: 'all', label: 'Все' },
    { id: 'upper_pull', label: 'Тяги / Спина' },
    { id: 'upper_push', label: 'Жимы / Грудь' },
    { id: 'legs', label: 'Ноги / Ягодицы' },
    { id: 'core', label: 'Кор / Статика' },
  ];

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchesSearch =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.cue.toLowerCase().includes(q) ||
        (ex.details?.toLowerCase().includes(q) ?? false) ||
        ex.target_muscles.some((m) =>
          getMuscleLabel(m).toLowerCase().includes(q)
        );

      if (!matchesSearch) return false;
      if (muscleFilter === 'all') return true;
      if (muscleFilter === 'upper_pull') {
        return ex.target_muscles.some((m) =>
          ['lats', 'upper_back', 'biceps', 'rear_delts', 'forearms'].includes(m)
        );
      }
      if (muscleFilter === 'upper_push') {
        return ex.target_muscles.some((m) =>
          ['chest', 'triceps', 'front_delts', 'shoulder_press'].includes(m)
        );
      }
      if (muscleFilter === 'legs') {
        return ex.target_muscles.some((m) =>
          ['quads', 'glutes', 'hamstrings', 'hip_flexors'].includes(m)
        );
      }
      if (muscleFilter === 'core') {
        return ex.target_muscles.some((m) =>
          ['core', 'obliques', 'spine_decompression'].includes(m)
        );
      }
      return true;
    });
  }, [exercises, search, muscleFilter]);

  const toggleTag = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    tag: string
  ) => {
    if (list.includes(tag)) {
      if (list.length > 1) {
        setList(list.filter((t) => t !== tag));
      }
    } else {
      setList([...list, tag]);
    }
  };

  const handleCreateExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setFormError('Введите название упражнения на английском.');
      return;
    }
    const parsedMax = Math.max(1, parseInt(newMax, 10) || 10);
    const created: Exercise = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      metric: newMetric,
      checkup_max: parsedMax,
      lastCheckupDate: new Date().toISOString(),
      target_muscles: newTargets,
      antagonist_muscles: newAntagonists,
      cue:
        newCue.trim() ||
        'Контролируйте амплитуду и ровное дыхание на каждом повторении.',
      svgKey: newSvgKey,
      isPaired: newIsPaired,
      isCustom: true,
    };

    onAddExercise(created);
    setNewName('');
    setNewCue('');
    setNewMax('15');
    setNewIsPaired(false);
    setFormError('');
    setShowAddModal(false);
  };

  const antagonistResults = antagonistSource
    ? findAntagonistMatches(antagonistSource, exercises)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-5 pt-5 pb-32 landscape:pb-10 lg:pb-12">
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 dark:border-[#1E293B] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            База движений и антагонистов
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            Catalog ({exercises.length})
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="tap-scale flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] px-4 text-xs font-bold text-white hover:bg-[#B91C1C]"
        >
          <Plus className="h-4 w-4" />
          Добавить упражнение
        </button>
      </div>

      {/* Search + Muscle Group Filter */}
      <div className="mt-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или мышце..."
            className="min-h-[46px] w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-[#111827] placeholder:text-gray-400 focus:border-[#111827] focus:bg-white focus:outline-none dark:border-[#263248] dark:bg-[#131A26] dark:text-[#F3F4F6] dark:placeholder:text-gray-500 dark:focus:border-[#64748B] dark:focus:bg-[#1A2333]"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setMuscleFilter(chip.id)}
              className={`tap-scale min-h-[40px] shrink-0 whitespace-nowrap rounded-xl px-3.5 text-xs font-semibold transition-colors ${
                muscleFilter === chip.id
                  ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                  : 'bg-gray-100 text-gray-600 hover:text-[#111827] dark:bg-[#131A26] dark:text-gray-300 dark:hover:text-[#F3F4F6]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredExercises.map((ex) => (
          <article
            key={ex.id}
            className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-bold leading-snug text-[#111827] dark:text-[#F3F4F6]">
                    {ex.name}
                  </h2>
                  <p className="font-mono-num mt-0.5 text-xs font-semibold text-[#DC2626] dark:text-[#F87171]">
                    Max {formatMetricShort(ex.checkup_max, ex.metric)}
                  </p>
                </div>
                <ExerciseSvg
                  svgKey={ex.svgKey}
                  className="h-16 w-24 shrink-0"
                />
              </div>

              <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                {ex.details ?? ex.cue}
              </p>

              {/* Clean unboxed muscle tag metadata */}
              <div className="mt-3 space-y-1 border-t border-gray-100 pt-2.5 text-xs dark:border-[#1E293B]">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Цель:{' '}
                  </span>
                  {ex.target_muscles.map(getMuscleLabel).join(' · ')}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    Антагонисты:{' '}
                  </span>
                  {ex.antagonist_muscles.map(getMuscleLabel).join(' · ')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAntagonistSource(ex)}
              className="tap-scale mt-3.5 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-[#111827] hover:border-[#111827] dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:hover:border-[#64748B]"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-[#DC2626] dark:text-[#F87171]" />
              Подобрать антагонист
            </button>
          </article>
        ))}
      </div>

      {/* Antagonist Matcher Modal */}
      {antagonistSource && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 sm:items-center">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 dark:border dark:border-[#232E42] dark:bg-[#131A26] sm:rounded-3xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600 sm:hidden" />
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3 dark:border-[#1E293B]">
              <div>
                <p className="text-xs font-semibold text-[#DC2626] dark:text-[#F87171]">
                  Подбор антагонистов
                </p>
                <h3 className="text-lg font-bold text-[#111827] dark:text-[#F3F4F6]">
                  {antagonistSource.name}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Ищем теги:{' '}
                  {antagonistSource.antagonist_muscles
                    .map(getMuscleLabel)
                    .join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAntagonistSource(null)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#1E293B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 max-h-80 space-y-2.5 overflow-y-auto">
              {antagonistResults.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Подходящих антагонистов в каталоге не найдено.
                </p>
              ) : (
                antagonistResults.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-[#263248] dark:bg-[#1A2333]"
                  >
                    <ExerciseSvg
                      svgKey={match.svgKey}
                      className="h-14 w-20 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold leading-snug text-[#111827] dark:text-[#F3F4F6]">
                        {match.name}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                        {match.target_muscles.map(getMuscleLabel).join(' · ')}
                      </p>
                      <p className="font-mono-num mt-0.5 text-[11px] font-semibold text-[#DC2626] dark:text-[#F87171]">
                        Max {formatMetricShort(match.checkup_max, match.metric)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Exercise Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 sm:items-center">
          <form
            onSubmit={handleCreateExercise}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 dark:border dark:border-[#232E42] dark:bg-[#131A26] sm:rounded-3xl"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600 sm:hidden" />
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-[#1E293B]">
              <h3 className="text-lg font-bold text-[#111827] dark:text-[#F3F4F6]">
                Новое упражнение
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#1E293B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Название (на английском)
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Например: Archer Push-Ups"
                  className="mt-1 min-h-[46px] w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-[#111827] focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:placeholder:text-gray-500 dark:focus:border-[#64748B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Единица измерения
                  </label>
                  <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-[#1A2333]">
                    <button
                      type="button"
                      onClick={() => setNewMetric('reps')}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold ${
                        newMetric === 'reps'
                          ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2C3A52] dark:text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Повторы
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMetric('seconds')}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold ${
                        newMetric === 'seconds'
                          ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2C3A52] dark:text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Секунды
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Check-Up Максимум
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newMax}
                    onChange={(e) => setNewMax(e.target.value)}
                    className="font-mono-num mt-1 min-h-[46px] w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm font-bold text-[#111827] focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:focus:border-[#64748B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Подробная техника выполнения
                </label>
                <textarea
                  rows={3}
                  value={newCue}
                  onChange={(e) => setNewCue(e.target.value)}
                  placeholder="Исходное положение, траектория движения, дыхание и акценты."
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:placeholder:text-gray-500 dark:focus:border-[#64748B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Схема упражнения
                </label>
                <select
                  value={newSvgKey}
                  onChange={(e) => setNewSvgKey(e.target.value as SvgKey)}
                  className="mt-1 min-h-[46px] w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-[#111827] focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:focus:border-[#64748B]"
                >
                  {SVG_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 dark:border-[#2A3548] dark:bg-[#1A2333]">
                <span className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                  Парное упражнение (левая / правая сторона)
                </span>
                <input
                  type="checkbox"
                  checked={newIsPaired}
                  onChange={(e) => setNewIsPaired(e.target.checked)}
                  className="h-4 w-4 accent-[#DC2626]"
                />
              </label>

              <div>
                <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Целевые мышцы (target_muscles)
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Object.keys(MUSCLE_LABELS).map((tag) => {
                    const active = newTargets.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(newTargets, setNewTargets, tag)}
                        className={`min-h-[34px] rounded-lg px-2.5 text-[11px] font-semibold transition-colors ${
                          active
                            ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                            : 'bg-gray-100 text-gray-600 dark:bg-[#1A2333] dark:text-gray-300'
                        }`}
                      >
                        {getMuscleLabel(tag)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Мышцы-антагонисты (antagonist_muscles)
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Object.keys(MUSCLE_LABELS).map((tag) => {
                    const active = newAntagonists.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          toggleTag(newAntagonists, setNewAntagonists, tag)
                        }
                        className={`min-h-[34px] rounded-lg px-2.5 text-[11px] font-semibold transition-colors ${
                          active
                            ? 'bg-[#DC2626] text-white'
                            : 'bg-gray-100 text-gray-600 dark:bg-[#1A2333] dark:text-gray-300'
                        }`}
                      >
                        {getMuscleLabel(tag)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <p className="text-xs font-semibold text-[#DC2626] dark:text-[#F87171]">
                  {formError}
                </p>
              )}
            </div>

            <div className="mt-5 pb-safe">
              <button
                type="submit"
                className="tap-scale min-h-[52px] w-full rounded-2xl bg-[#DC2626] text-sm font-bold text-white"
              >
                Добавить в каталог
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
