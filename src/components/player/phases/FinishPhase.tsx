import React from 'react';
import { Check } from 'lucide-react';
import { usePlayer } from '../PlayerContext';

export const FinishPhase: React.FC = () => {
  const {
    finishNote,
    handleSaveFinish,
    onExitSession,
    reminderDays,
    reminderGoogleUrl,
    reminderTime,
    rir,
    session,
    setFinishNote,
    setReminderDays,
    setReminderTime,
  } = usePlayer();

  const totalReps = session.logs
    .filter((l) => l.metric === 'reps')
    .reduce((acc, l) => acc + l.actual, 0);
  const totalHoldSec = session.logs
    .filter((l) => l.metric === 'seconds')
    .reduce((acc, l) => acc + l.actual, 0);
  const durationMin = Math.max(
    1,
    Math.round(
      (Date.now() - new Date(session.startedAt).getTime()) / 60000
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-white dark:bg-[#0B0F17]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-5 dark:border-[#1E293B] dark:bg-[#0F1520]">
        <span className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
          Тренировка завершена
        </span>
        <button
          type="button"
          onClick={onExitSession}
          className="min-h-[44px] px-2 text-xs font-semibold text-gray-500 hover:text-[#111827] dark:text-gray-400 dark:hover:text-white"
        >
          Закрыть без сохранения
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-between overflow-y-auto px-5 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#DC2626] dark:text-[#F87171]">
            Отличная работа
          </p>
          <h2 className="font-display mt-1 text-4xl font-bold text-[#111827] dark:text-[#F3F4F6]">
            {session.workoutTitle}
          </h2>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 dark:border-[#232E42] dark:bg-[#131A26]">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Длительность
              </p>
              <p className="font-mono-num mt-1 text-2xl font-bold text-[#111827] dark:text-[#F3F4F6]">
                {durationMin}м
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 dark:border-[#232E42] dark:bg-[#131A26]">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Подходы
              </p>
              <p className="font-mono-num mt-1 text-2xl font-bold text-[#111827] dark:text-[#F3F4F6]">
                {session.logs.length}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 dark:border-[#232E42] dark:bg-[#131A26]">
              <p className="text-xs text-gray-500 dark:text-gray-400">Объём</p>
              <p className="font-mono-num mt-1 text-2xl font-bold text-[#111827] dark:text-[#F3F4F6]">
                {totalReps > 0 ? `${totalReps}` : `${totalHoldSec}с`}
              </p>
            </div>
          </div>

          {totalHoldSec > 0 && totalReps > 0 && (
            <p className="font-mono-num mt-2 text-xs text-gray-500 dark:text-gray-400">
              Плюс статика: {totalHoldSec} сек
            </p>
          )}

          <div className="mt-5">
            <label
              htmlFor="finish-note"
              className="block text-xs font-semibold text-gray-600 dark:text-gray-300"
            >
              Заметка к тренировке (необязательно)
            </label>
            <input
              id="finish-note"
              type="text"
              value={finishNote}
              onChange={(e) => setFinishNote(e.target.value)}
              placeholder="Например: хорошее самочувствие, турник в парке"
              className="mt-1.5 min-h-[46px] w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-[#111827] placeholder:text-gray-400 focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:placeholder:text-gray-500 dark:focus:border-[#94A3B8]"
            />
          </div>

          {/* When is the next workout? → calendar event with a 1-hour alarm */}
          <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-3.5 dark:border-[#232E42] dark:bg-[#131A26]">
            <p className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
              Когда следующая тренировка?
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {(
                [
                  [1, 'Завтра'],
                  [2, 'Послезавтра'],
                  [3, 'Через 3 дня'],
                  [0, 'Не напоминать'],
                ] as const
              ).map(([days, label]) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setReminderDays(days)}
                  className={`tap-scale min-h-[44px] rounded-xl px-2 text-xs font-semibold transition-colors ${
                    reminderDays === days
                      ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                      : 'border border-gray-300 bg-white text-gray-700 dark:border-[#334155] dark:bg-[#1A2333] dark:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {reminderDays > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <label htmlFor="reminder-time" className="font-semibold">
                  Время
                </label>
                <input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => e.target.value && setReminderTime(e.target.value)}
                  className="font-mono-num min-h-[40px] rounded-xl border border-gray-300 bg-white px-2.5 text-sm font-bold text-[#111827] dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
                />
                <span>· напомню за час через календарь телефона</span>
                {typeof navigator !== 'undefined' && navigator.onLine && (
                  <a
                    href={reminderGoogleUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#2563EB] underline dark:text-[#60A5FA]"
                  >
                    или в Google Календарь
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              Записанные подходы ({session.logs.length})
            </p>
            <div className="max-h-52 divide-y divide-gray-100 overflow-y-auto rounded-2xl border border-gray-200 dark:divide-[#1E293B] dark:border-[#232E42] dark:bg-[#131A26]">
              {session.logs.map((log, i) => (
                <div
                  key={`${log.completedAt}-${i}`}
                  className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-mono-num mr-2 text-gray-400 dark:text-gray-500">
                      R{log.round}
                    </span>
                    <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      {log.exerciseName}
                    </span>
                  </div>
                  <div className="font-mono-num shrink-0 font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    {log.leftActual !== undefined &&
                    log.rightActual !== undefined
                      ? `${log.leftActual}/${log.rightActual}`
                      : log.actual}
                    {log.metric === 'seconds' ? 'с' : 'п'} · RIR {log.rir}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pb-safe pt-5">
          <button
            type="button"
            onClick={handleSaveFinish}
            className="tap-scale flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-6 text-base font-bold text-white"
          >
            <Check className="h-5 w-5" />
            Сохранить в журнал
          </button>
        </div>
      </main>
    </div>
  );
};
