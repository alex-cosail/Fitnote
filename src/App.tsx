import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  ClipboardList,
  Dumbbell,
  Moon,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BackupSection } from './components/BackupSection';
import { CatalogTab } from './components/CatalogTab';
import { CheckUpTab } from './components/CheckUpTab';
import { SyncLogTab } from './components/SyncLogTab';
import { WorkoutPlayer } from './components/WorkoutPlayer';
import { WorkoutPreviewTab } from './components/WorkoutPreviewTab';
import { CATALOG } from './data/catalog';
import { CATALOG_TEXT_RU } from './data/catalogText.ru';
import { CATALOG_IDS, RED_MOBILITY_EXERCISES, getWarmupPlan } from './data/seed';
import { resolveExercises } from './domain/catalog/resolve';
import { recordMax } from './domain/catalog/userMaxes';
import { applyImport, ImportPayload } from './domain/plan/importPlan';
import { calcAgt30, getEffectiveRounds } from './domain/plan/targets';
import { useWakeLock } from './hooks/useWakeLock';
import {
  ActiveSession,
  AppTab,
  CardioLog,
  CheckUpEntry,
  Exercise,
  FitnoteData,
  ReadinessLevel,
  WorkoutLog,
  WorkoutPlan,
} from './types';
import { soundEngine } from './utils/audio';
import { loadFitnoteData, saveFitnoteData } from './utils/storage';
import { APP_VERSION_LABEL } from './version';

const PROTECTED_WORKOUT_IDS = new Set([
  'workout-a',
  'workout-b',
  'workout-c-agt',
]);

export default function App() {
  const [data, setData] = useState<FitnoteData>(() => {
    const loaded = loadFitnoteData();
    // Refresh remaining timer seconds if an active timed phase was running
    if (
      loaded.activeSession &&
      !loaded.activeSession.isPaused &&
      loaded.activeSession.phaseEndTimestamp
    ) {
      const rem = Math.max(
        0,
        Math.ceil((loaded.activeSession.phaseEndTimestamp - Date.now()) / 1000)
      );
      if (
        loaded.activeSession.preCountdownSec &&
        loaded.activeSession.preCountdownSec > 0
      ) {
        loaded.activeSession = {
          ...loaded.activeSession,
          preCountdownSec: rem,
        };
      } else {
        loaded.activeSession = {
          ...loaded.activeSession,
          phaseRemainingSec: rem,
        };
      }
    }
    return loaded;
  });

  // Screens work with resolved exercises: catalog (code) + user maxima + custom.
  const exercises = useMemo(
    () =>
      resolveExercises(CATALOG, CATALOG_TEXT_RU, data.maxes, data.customExercises),
    [data.maxes, data.customExercises]
  );

  const [activeTab, setActiveTab] = useState<AppTab>('workout');
  const [isPlayerVisible, setIsPlayerVisible] = useState<boolean>(
    () => Boolean(loadFitnoteData().activeSession)
  );

  const isWakeLockActive = Boolean(
    isPlayerVisible && data.activeSession && !data.activeSession.isPaused
  );
  useWakeLock(isWakeLockActive);

  useLayoutEffect(() => {
    const isDark = data.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0B0F17' : '#FFFFFF');
    }
  }, [data.theme]);

  useEffect(() => {
    saveFitnoteData(data);
  }, [data]);

  const handleToggleMute = () => {
    setData((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const handleToggleTheme = () => {
    setData((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const handleStartWorkout = () => {
    soundEngine.unlock();
    const plan =
      data.workouts.find((w) => w.id === data.selectedWorkoutId) ??
      data.workouts[0];

    const readiness: ReadinessLevel = data.readiness;
    const isRed = readiness === 'red';

    const effectiveRounds = getEffectiveRounds(plan.rounds, readiness);

    const sessionItems = isRed
      ? RED_MOBILITY_EXERCISES.map((item) => ({
          exerciseId: item.exerciseId,
          target: item.target,
          plannedTarget: item.target,
        }))
      : plan.items.map((item) => {
          const ex = exercises.find((e) => e.id === item.exerciseId);
          const target =
            plan.useAgt30 && ex ? calcAgt30(ex) : item.target;
          return {
            exerciseId: item.exerciseId,
            target,
            plannedTarget: target,
          };
        });

    const isRoundFlow = !isRed && (Boolean(plan.useAgt30) || plan.rounds >= 8);

    const warmupSec = data.warmupMinutes * 60;
    const initialWarmupSteps = getWarmupPlan(data.warmupMinutes).steps;

    const newSession: ActiveSession = {
      id: `sess-${Date.now()}`,
      workoutId: plan.id,
      workoutTitle: isRed ? 'Mobility 20 min' : plan.title,
      readiness,
      totalRounds: effectiveRounds,
      currentRound: 1,
      currentItemIndex: 0,
      phase: 'warmup',
      warmupMinutes: data.warmupMinutes,
      warmupStepIndex: 0,
      warmupStepRemainingSec: initialWarmupSteps[0]?.durationSeconds ?? warmupSec,
      preCountdownSec: 5,
      cooldownMinutes: 5,
      phaseRemainingSec: warmupSec,
      phaseEndTimestamp: Date.now() + 5000,
      isPaused: false,
      items: sessionItems,
      logs: [],
      startedAt: new Date().toISOString(),
      restBetweenExercises: isRed ? 20 : plan.restBetweenExercises,
      restBetweenRounds: isRed ? 45 : plan.restBetweenRounds,
      isMobilityOnly: isRed,
      isRoundFlow,
    };

    setData((prev) => ({ ...prev, activeSession: newSession }));
    setIsPlayerVisible(true);
  };

  const handleUpdateSession = (nextSession: ActiveSession) => {
    setData((prev) => ({ ...prev, activeSession: nextSession }));
  };

  const handleCompleteSession = (log: WorkoutLog) => {
    setData((prev) => ({
      ...prev,
      workoutLogs: [log, ...prev.workoutLogs],
      activeSession: null,
    }));
    setIsPlayerVisible(false);
    setActiveTab('sync');
  };

  const handleExitPlayer = () => {
    setIsPlayerVisible(false);
  };

  const handleDiscardActiveSession = () => {
    setData((prev) => ({ ...prev, activeSession: null }));
    setIsPlayerVisible(false);
  };

  const handleRecordCheckUp = (exerciseId: string, newMax: number) => {
    const targetEx = exercises.find((e) => e.id === exerciseId);
    if (!targetEx) return;
    const nowIso = new Date().toISOString();
    const updatedEx: Exercise = {
      ...targetEx,
      checkup_max: newMax,
      lastCheckupDate: nowIso,
    };
    const entry: CheckUpEntry = {
      id: `cu-${Date.now()}`,
      date: nowIso,
      exerciseId: targetEx.id,
      exerciseName: targetEx.name,
      metric: targetEx.metric,
      value: newMax,
      agt30: calcAgt30(updatedEx),
    };

    setData((prev) => ({
      ...prev,
      ...recordMax(prev, CATALOG_IDS, exerciseId, newMax, nowIso),
      checkUpHistory: [entry, ...prev.checkUpHistory],
    }));
  };

  const handleAddExercise = (exercise: Exercise) => {
    setData((prev) => ({
      ...prev,
      customExercises: [{ ...exercise, isCustom: true }, ...prev.customExercises],
    }));
  };

  const handleAddCardio = (log: CardioLog) => {
    setData((prev) => ({
      ...prev,
      cardioLogs: [log, ...prev.cardioLogs],
    }));
  };

  const handleDeleteWorkoutLog = (id: string) => {
    setData((prev) => ({
      ...prev,
      workoutLogs: prev.workoutLogs.filter((w) => w.id !== id),
    }));
  };

  const handleDeleteCardioLog = (id: string) => {
    setData((prev) => ({
      ...prev,
      cardioLogs: prev.cardioLogs.filter((c) => c.id !== id),
    }));
  };

  const handleDeleteWorkout = (id: string) => {
    if (PROTECTED_WORKOUT_IDS.has(id)) return;
    setData((prev) => {
      const remaining = prev.workouts.filter((w) => w.id !== id);
      const nextSelectedId =
        prev.selectedWorkoutId === id
          ? (remaining[0]?.id ?? 'workout-a')
          : prev.selectedWorkoutId;
      return {
        ...prev,
        workouts: remaining,
        selectedWorkoutId: nextSelectedId,
      };
    });
  };

  const handleUpdateWorkout = (updatedPlan: WorkoutPlan) => {
    setData((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w) =>
        w.id === updatedPlan.id ? updatedPlan : w
      ),
    }));
  };

  // Counts come from the same pure merge that updates the state, so the
  // "Imported N plans" message is always right.
  const handleImportPlan = (payload: ImportPayload) => {
    const result = applyImport(
      {
        maxes: data.maxes,
        customExercises: data.customExercises,
        workouts: data.workouts,
      },
      payload,
      CATALOG_IDS
    );
    setData((prev) => ({
      ...prev,
      maxes: result.maxes,
      customExercises: result.customExercises,
      workouts: result.workouts,
    }));
    return {
      addedWorkouts: result.addedWorkouts,
      addedExercises: result.addedExercises,
    };
  };

  const navItems: {
    id: AppTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'workout', label: 'Workout', icon: Dumbbell },
    { id: 'checkup', label: 'Check-Up', icon: Activity },
    { id: 'catalog', label: 'Catalog', icon: BookOpen },
    { id: 'sync', label: 'Sync / Log', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#111827] transition-colors dark:bg-[#0B0F17] dark:text-[#F3F4F6]">
      {/* Landscape Top Navigation (scrolls away on phone landscape, sticky on lg+ desktop) */}
      <header className="z-30 hidden border-b border-gray-200 bg-white/95 backdrop-blur-md dark:border-[#1E293B] dark:bg-[#0F1520]/95 landscape:block lg:sticky lg:top-0">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-4 lg:h-14 lg:gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('workout')}
            className="font-display flex shrink-0 items-baseline gap-1.5 whitespace-nowrap text-xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6] lg:text-2xl"
          >
            Fitnote
            <span className="font-mono-num text-[10px] font-medium tracking-normal text-gray-400 dark:text-gray-500">
              {APP_VERSION_LABEL}
            </span>
          </button>

          <nav className="flex items-center gap-4 overflow-x-auto sm:gap-6">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`min-h-[44px] shrink-0 whitespace-nowrap border-b-2 px-1 text-xs font-semibold transition-colors sm:text-sm ${
                    isActive
                      ? 'border-[#DC2626] text-[#111827] dark:text-[#F3F4F6]'
                      : 'border-transparent text-gray-500 hover:text-[#111827] dark:text-gray-400 dark:hover:text-[#F3F4F6]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            {activeTab === 'workout' && (
              <button
                type="button"
                onClick={handleToggleTheme}
                aria-label={
                  data.theme === 'dark'
                    ? 'Включить дневную светлую тему'
                    : 'Включить вечернюю тёмную тему'
                }
                className="tap-scale flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-[#111827] hover:bg-gray-50 dark:border-[#2A3548] dark:bg-[#141A24] dark:text-[#F3F4F6] dark:hover:bg-[#1E293B]"
              >
                {data.theme === 'dark' ? (
                  <>
                    <Moon className="h-4 w-4 text-[#FBBF24]" />
                    <span className="hidden sm:inline">Ночь</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4 text-[#D97706]" />
                    <span className="hidden sm:inline">День</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleMute}
              className="tap-scale flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#111827] hover:bg-gray-50 dark:border-[#2A3548] dark:bg-[#141A24] dark:text-[#F3F4F6] dark:hover:bg-[#1E293B]"
            >
              {data.isMuted ? (
                <>
                  <VolumeX className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="hidden sm:inline">Звук выкл</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 text-[#DC2626] dark:text-[#EF4444]" />
                  <span className="hidden sm:inline">Звук вкл</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Portrait Mobile Brand Strip */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-[#1E293B] landscape:hidden">
        <span className="font-display flex items-baseline gap-1.5 text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
          Fitnote
          <span className="font-mono-num text-[10px] font-medium tracking-normal text-gray-400 dark:text-gray-500">
            {APP_VERSION_LABEL}
          </span>
        </span>
        <div className="flex items-center gap-1">
          {activeTab === 'workout' && (
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={
                data.theme === 'dark'
                  ? 'Включить дневную светлую тему'
                  : 'Включить вечернюю тёмную тему'
              }
              className="tap-scale flex min-h-[44px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300"
            >
              {data.theme === 'dark' ? (
                <>
                  <Moon className="h-4 w-4 text-[#FBBF24]" />
                  <span>Ночь</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 text-[#D97706]" />
                  <span>День</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleMute}
            className="tap-scale flex min-h-[44px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300"
            aria-label={data.isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {data.isMuted ? (
              <VolumeX className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            ) : (
              <Volume2 className="h-4 w-4 text-[#DC2626] dark:text-[#EF4444]" />
            )}
            <span>{data.isMuted ? 'Mute' : 'Звук'}</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <main>
        {activeTab === 'workout' && (
          <WorkoutPreviewTab
            workouts={data.workouts}
            exercises={exercises}
            selectedWorkoutId={data.selectedWorkoutId}
            readiness={data.readiness}
            warmupMinutes={data.warmupMinutes}
            activeSession={data.activeSession}
            onSelectWorkout={(id) =>
              setData((prev) => ({ ...prev, selectedWorkoutId: id }))
            }
            onDeleteWorkout={handleDeleteWorkout}
            onUpdateWorkout={handleUpdateWorkout}
            onChangeReadiness={(readiness) =>
              setData((prev) => ({
                ...prev,
                readiness,
                warmupMinutes: readiness === 'red' ? 8 : prev.warmupMinutes,
              }))
            }
            onChangeWarmupMinutes={(warmupMinutes) =>
              setData((prev) => ({ ...prev, warmupMinutes }))
            }
            onStartWorkout={handleStartWorkout}
            onResumeWorkout={() => setIsPlayerVisible(true)}
            onDiscardActiveSession={handleDiscardActiveSession}
          />
        )}

        {activeTab === 'checkup' && (
          <CheckUpTab
            exercises={exercises}
            history={data.checkUpHistory}
            isMuted={data.isMuted}
            onRecordCheckUp={handleRecordCheckUp}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogTab
            exercises={exercises}
            onAddExercise={handleAddExercise}
          />
        )}

        {activeTab === 'sync' && (
          <SyncLogTab
            exercises={exercises}
            workouts={data.workouts}
            workoutLogs={data.workoutLogs}
            cardioLogs={data.cardioLogs}
            checkUpHistory={data.checkUpHistory}
            onAddCardio={handleAddCardio}
            onDeleteWorkoutLog={handleDeleteWorkoutLog}
            onDeleteCardioLog={handleDeleteCardioLog}
            onImportPlan={handleImportPlan}
            topSlot={
              <BackupSection
                data={data}
                onBackupSaved={(iso) =>
                  setData((prev) => ({ ...prev, lastBackupAt: iso }))
                }
                onRestore={(restored) => {
                  setData({ ...restored, activeSession: null });
                  setIsPlayerVisible(false);
                }}
              />
            }
          />
        )}
      </main>

      {/* Portrait Mobile Fixed 4-Tab Bottom Navigation (lifted away from rounded bottom edges) */}
      <nav
        aria-label="Основная навигация"
        className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-40 rounded-2xl border border-gray-200 bg-white/95 shadow-lg shadow-black/5 backdrop-blur-md dark:border-[#1E293B] dark:bg-[#101622]/95 dark:shadow-black/50 landscape:hidden"
      >
        <div className="grid h-15 grid-cols-4 items-center px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex min-h-[46px] flex-col items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? 'text-[#DC2626] dark:text-[#EF4444]'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-1 whitespace-nowrap text-[10px] font-semibold tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Fullscreen Linear Workout Player */}
      {isPlayerVisible && data.activeSession && (
        <WorkoutPlayer
          session={data.activeSession}
          exercises={exercises}
          isMuted={data.isMuted}
          onToggleMute={handleToggleMute}
          onUpdateSession={handleUpdateSession}
          onCompleteSession={handleCompleteSession}
          onExitSession={handleExitPlayer}
        />
      )}
    </div>
  );
}