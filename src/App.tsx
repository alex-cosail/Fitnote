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
import { GeneratorPanel } from './components/GeneratorPanel';
import { OnboardingWizard } from './components/OnboardingWizard';
import { MePanel } from './components/MePanel';
import { WeekReadyPanel } from './components/WeekReadyPanel';
import { WeekStrip } from './components/WeekStrip';
import {
  Cycle, DayView, addDays, implicitCycle, localDate, moveDay, planOn, strengthInARow, weekDates, weekView,
} from './domain/schedule/schedule';
import { planKind } from './domain/schedule/kind';
import { CycleChoice, freshIds, placeSingle, placeWeek } from './domain/schedule/place';
import { addPatterns, mondayNote, reviewWeek, topUpDue } from './domain/schedule/compensation';
import { buildSession, historyFromLogs } from './domain/generator';
import { mondayOf } from './domain/schedule/schedule';
import { patternList } from './components/generatorLabels';
import { cycleAt, cycleRecurrence, defaultDays } from './domain/schedule/schedule';
import { androidCalendarIntentUrl, buildIcsEvent, googleCalendarUrl, isAndroid } from './domain/reminder/ics';
import { shareOrDownloadCalendar } from './utils/download';
import { planLabel } from './components/generatorLabels';
import { SyncLogTab } from './components/SyncLogTab';
import { WorkoutPlayer } from './components/WorkoutPlayer';
import { WorkoutPreviewTab } from './components/WorkoutPreviewTab';
import { CATALOG } from './data/catalog';
import { catalogTextsFor } from './data/catalogTexts';
import { CATALOG_IDS, RED_MOBILITY_EXERCISES, getWarmupPlan } from './data/seed';
import { resolveExercises } from './domain/catalog/resolve';
import { baseCheckupIds, estimateMaxes } from './domain/catalog/estimate';
import { dayPlan, dayTimes, runGenerator, toWorkoutPlans } from './domain/generator';
import { UserProfile, requestFor, toGeneratorProfile } from './domain/profile/profile';
import { recordMax } from './domain/catalog/userMaxes';
import { resolveWorkout } from './domain/plan/resolveWorkout';
import { applyImport, ImportPayload } from './domain/plan/importPlan';
import { calcAgt30, getEffectiveRounds } from './domain/plan/targets';
import { useWakeLock } from './hooks/useWakeLock';
import { I18nProvider, Locale, makeT } from './i18n';
import type { TranslationKey } from './i18n/ru';
import { useHashRoute } from './routing/useHashRoute';
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

  const locale: Locale = data.locale ?? 'ru';
  const t = makeT(locale);

  // Screens work with resolved exercises: catalog (code) + user maxima + custom.
  // Unmeasured exercises get a max estimated from a measured one of the same
  // ladder family (check-up with only the base tests, field test 26.11).
  const level = data.profile?.level ?? 'medium';
  const exercises = useMemo(() => {
    const est = estimateMaxes(CATALOG, data.maxes, level);
    const estimated = Object.fromEntries(
      Object.entries(est)
        .filter(([, e]) => e.source === 'estimated')
        .map(([id, e]) => [id, { value: e.value }])
    );
    return resolveExercises(
      CATALOG,
      catalogTextsFor(locale),
      { ...estimated, ...data.maxes },
      data.customExercises,
      level
    );
  }, [locale, data.maxes, data.customExercises, level]);

  // The person as the generator sees them (defaults until the start wizard).
  const genProfile = useMemo(
    () => toGeneratorProfile(data.profile, data.favorites ?? []),
    [data.profile, data.favorites]
  );

  // Tabs follow the URL hash (#/workout, #/log, …); #/onboarding is the start
  // wizard. Routes reserved for later steps (studio, shared workouts) show the
  // Workout tab for now.
  const [route, navigate] = useHashRoute();
  const isOnboarding = route.name === 'onboarding';
  const activeTab: AppTab = route.name === 'tab' ? route.tab : 'workout';
  const setActiveTab = (tab: AppTab) => navigate({ name: 'tab', tab });
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

    // The plan actually played today for the chosen mode (short ⅔ rounds,
    // accent focus pairs under the minutes); red plays the mobility block.
    const times = dayTimes(readiness, data.warmupMinutes);
    const today = dayPlan(plan, readiness, {
      catalog: CATALOG,
      accentMinutes: data.accentMinutes,
      profile: genProfile,
      ...times,
    }).plan;
    const effectiveRounds = getEffectiveRounds(today.rounds, readiness === 'yellow' ? 'green' : readiness);

    const sessionItems = isRed
      ? RED_MOBILITY_EXERCISES.map((item) => ({
          exerciseId: item.exerciseId,
          target: item.target,
          plannedTarget: item.target,
        }))
      : resolveWorkout(today, { catalog: CATALOG, exercises }).map((r) => ({
          exerciseId: r.exerciseId,
          target: r.target,
          plannedTarget: r.target,
        }));

    const isRoundFlow = !isRed && (Boolean(today.useAgt30) || today.rounds >= 8);

    const warmupSec = times.warmupMinutes * 60;
    const initialWarmupSteps = getWarmupPlan(times.warmupMinutes).steps;

    const newSession: ActiveSession = {
      id: `sess-${Date.now()}`,
      workoutId: plan.id,
      workoutTitle: isRed ? 'Mobility 20 min' : plan.title,
      readiness,
      totalRounds: effectiveRounds,
      currentRound: 1,
      currentItemIndex: 0,
      phase: 'warmup',
      warmupMinutes: times.warmupMinutes,
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
      restBetweenExercises: isRed ? 20 : today.restBetweenExercises,
      restBetweenRounds: isRed ? 45 : today.restBetweenRounds,
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

  // Generator: new generated plans replace the previous generated ones and
  // the first becomes the selected workout.
  // ——— The week (v3.5): cycles lay plans out on weekdays; moves are overrides.
  const today = localDate(new Date());
  const cycles: Cycle[] = useMemo(() => {
    if (data.cycles && data.cycles.length) return data.cycles;
    const c = implicitCycle(data.workouts, data.profile?.perWeek ?? 3, today);
    return c ? [c] : [];
  }, [data.cycles, data.workouts, data.profile?.perWeek, today]);
  const overrides = data.dayOverrides ?? {};
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekWarning, setWeekWarning] = useState('');
  const weekDays = useMemo(
    () => weekView(cycles, overrides, data.workoutLogs, weekAnchor, today),
    [cycles, overrides, data.workoutLogs, weekAnchor, today]
  );
  const planById = useMemo(() => new Map(data.workouts.map((w) => [w.id, w])), [data.workouts]);
  const kindOf = (id: string) => {
    const p = planById.get(id);
    return p ? planKind(p) : undefined;
  };
  const weekLabel = (() => {
    const [mon, , , , , , sun] = weekDates(weekAnchor);
    const fmt = (d: string) => `${Number(d.slice(8, 10))}.${d.slice(5, 7)}`;
    const which = weekDates(today)[0] === mon ? t('week.this') : mon > today ? t('week.next') : t('week.prev');
    return `${which} · ${fmt(mon)}–${fmt(sun)}`;
  })();

  // On launch: today's workout is the selected one.
  useEffect(() => {
    const p = planOn(cycles, overrides, today);
    if (p && planById.has(p)) setData((prev) => ({ ...prev, selectedWorkoutId: p }));
    // only on launch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectDay = (day: DayView) => {
    setSelectedDate(day.date);
    setWeekWarning('');
    if (day.planId && planById.has(day.planId)) {
      setData((prev) => ({ ...prev, selectedWorkoutId: day.planId! }));
    }
  };

  const handleMoveDay = (from: string, to: string) => {
    const target = weekDays.find((d) => d.date === to);
    if (target?.status === 'done') {
      setWeekWarning(t('week.doneTaken'));
      return;
    }
    const next = moveDay(cycles, overrides, from, to);
    setData((prev) => ({ ...prev, cycles: prev.cycles?.length ? prev.cycles : cycles, dayOverrides: next }));
    setSelectedDate(to);
    // Warn only about neighbours that still lie ahead or were done (a missed
    // past day does not tire anyone).
    const after = weekView(cycles, next, data.workoutLogs, to, today);
    const counts = (d: string) => {
      const v = after.find((x) => x.date === d);
      return !v || v.status !== 'missed';
    };
    const isStrength = (id: string) => kindOf(id) === 'S';
    const warn = strengthInARow(cycles, next, to, isStrength) && [addDays(to, -1), addDays(to, 1)].some((d) => {
      const p = planOn(cycles, next, d);
      return Boolean(p && isStrength(p) && counts(d));
    });
    setWeekWarning(warn ? t('week.strengthInRow') : '');
  };

  // The week built at the end of the wizard, shown on «Ваша неделя готова»,
  // with the data before it was placed (so «Когда начать?» can be changed).
  const [ready, setReady] = useState<{
    plans: WorkoutPlan[];
    base: Pick<FitnoteData, 'workouts' | 'cycles' | 'dayOverrides' | 'selectedWorkoutId'>;
    choice: CycleChoice;
    days: import('./domain/schedule/schedule').Weekday[];
    title: string;
  } | null>(null);
  const readyPlans = ready?.plans ?? null;
  const hasActiveCycle = Boolean(data.cycles?.length && cycleAt(data.cycles, today));

  // A brand-new person (no profile, no journal) meets the app first.
  useEffect(() => {
    if (!data.profile && !data.onboardingDismissed && data.workoutLogs.length === 0 && !isOnboarding) {
      navigate({ name: 'onboarding' });
    }
    // only on launch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start wizard done: remember the person and build their week right away.
  const handleCompleteProfile = (profile: UserProfile) => {
    const result = runGenerator(
      { ...requestFor(profile), period: 'week' },
      {
        catalog: CATALOG,
        exercises,
        logs: data.workoutLogs,
        date: new Date().toISOString().slice(0, 10),
        profile: toGeneratorProfile(profile, data.favorites ?? []),
      }
    );
    const plans = freshIds(toWorkoutPlans(result, (gw, week) => planLabel(t, gw, week)), Date.now().toString(36));
    const days = profile.days ?? defaultDays(profile.perWeek);
    const title = t(`wiz.health.${profile.healthLevel}` as TranslationKey);
    // A running cycle and new answers: new accents go into it by default.
    const choice: CycleChoice = hasActiveCycle ? 'update' : 'today';
    const base = {
      workouts: data.workouts,
      cycles: data.cycles,
      dayOverrides: data.dayOverrides,
      selectedWorkoutId: data.selectedWorkoutId,
    };
    setData((prev) => ({ ...placeWeek({ ...prev, ...base }, plans, choice, days, title, today), profile }));
    // Stay in the wizard and show the result (field test 26.11).
    setReady({ plans, base, choice, days, title });
    window.scrollTo(0, 0);
  };

  const handleDismissOnboarding = () => {
    setData((prev) => ({ ...prev, onboardingDismissed: true }));
    setActiveTab('workout');
  };

  // ——— Compensation (soft): weekend top-up and the start of a week ———
  const perWeekNow = data.profile?.perWeek ?? 3;
  const monday = mondayOf(today);
  const dismissed = new Set(data.compensationDismissed ?? []);
  const weekReview = useMemo(
    () => reviewWeek(data.workoutLogs, CATALOG, today, perWeekNow),
    [data.workoutLogs, today, perWeekNow]
  );
  const showTopUp = topUpDue(weekReview, today) && !dismissed.has(`${monday}:topup`);
  const note = useMemo(
    () => mondayNote(data.workoutLogs, CATALOG, today, perWeekNow),
    [data.workoutLogs, today, perWeekNow]
  );
  const showMonday = Boolean(note) && !dismissed.has(`${monday}:monday`);
  const dismissCard = (key: 'topup' | 'monday') =>
    setData((prev) => ({ ...prev, compensationDismissed: [...(prev.compensationDismissed ?? []).slice(-10), `${monday}:${key}`] }));
  const genCtx = () => ({ catalog: CATALOG, exercises, history: historyFromLogs(data.workoutLogs, exercises), date: today });

  const handleAddTopUp = () => {
    const gw = buildSession(
      weekReview.missing.map((pattern) => ({ pattern })),
      genProfile,
      genCtx(),
      { kind: 'TOPUP', component: genProfile.healthLevel === 'strength' ? 'S' : 'F', index: 0, usedThisWeek: new Set(), roundsOverride: 2 }
    );
    const [plan] = freshIds([{ ...gw.plan, ...planLabel(t, gw), title: t('comp.topupTitle') }], Date.now().toString(36));
    setData((prev) => ({ ...placeSingle(prev, plan, today), compensationDismissed: [...(prev.compensationDismissed ?? []), `${monday}:topup`] }));
    setSelectedDate(today);
  };

  // The first workout of this week from today on (for the Monday note).
  const firstPlanThisWeek = (() => {
    for (const d of weekDates(today).filter((x) => x >= today)) {
      const p = planOn(cycles, overrides, d);
      if (p && planById.has(p)) return planById.get(p)!;
    }
    return undefined;
  })();

  const stillMissing = (() => {
    if (!note || !firstPlanThisWeek) return [];
    const byId = new Map(CATALOG.map((c) => [c.id, c]));
    const has = new Set(firstPlanThisWeek.items.map((it) => it.pattern ?? byId.get(it.exerciseId!)?.pattern));
    return note.missing.filter((p) => !has.has(p));
  })();

  const handleTakeInMissing = () => {
    if (!note || !firstPlanThisWeek) return;
    const next = addPatterns(firstPlanThisWeek, note.missing, planKind(firstPlanThisWeek), genProfile, genCtx());
    setData((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w) => (w.id === next.id ? next : w)),
      selectedWorkoutId: next.id,
      compensationDismissed: [...(prev.compensationDismissed ?? []), `${monday}:monday`],
    }));
  };

  // The current (or the next upcoming) cycle as one repeating calendar event
  // with the usual reminder time; Android opens «Новое событие» (v2.4.1).
  const handleCycleToCalendar = async () => {
    const upcoming = [...(data.cycles ?? cycles)]
      .filter((c) => !c.endDate || c.endDate >= today)
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    const cycle = cycleAt(data.cycles ?? cycles, today) && !upcoming.some((c) => c.startDate > today)
      ? cycleAt(data.cycles ?? cycles, today)!
      : upcoming[0];
    if (!cycle) return;
    const rec = cycleRecurrence(cycle, today, data.reminder?.time ?? '18:00');
    if (!rec) return;
    const names = cycle.planIds.map((id) => planById.get(id)?.title).filter(Boolean).join(' · ');
    const ev = {
      uid: `fitnote-${cycle.id}@fitnote`,
      title: t('cal.title'),
      description: `${names}\n${window.location.origin}/#/workout`,
      start: rec.start,
      durationMinutes: 45,
      now: new Date(),
      rrule: rec.rrule,
    };
    if (isAndroid(navigator.userAgent)) {
      window.location.href = androidCalendarIntentUrl(ev, googleCalendarUrl(ev));
      return;
    }
    try {
      await shareOrDownloadCalendar('fitnote-week.ics', buildIcsEvent(ev));
    } catch {
      // the share sheet was closed
    }
  };

  const handleReadyChoice = (choice: CycleChoice) => {
    if (!ready) return;
    setData((prev) => placeWeek({ ...prev, ...ready.base }, ready.plans, choice, ready.days, ready.title, today));
    setReady({ ...ready, choice });
  };

  const handleAddGenerated = (
    rawPlans: WorkoutPlan[],
    how: { choice: CycleChoice; single: boolean; perWeek: number }
  ) => {
    if (rawPlans.length === 0) return;
    const plans = freshIds(rawPlans, Date.now().toString(36));
    const days = data.profile?.days ?? defaultDays(how.perWeek);
    setData((prev) =>
      how.single
        ? placeSingle(prev, plans[0], today)
        : placeWeek(prev, plans, how.choice, days, plans[0].formatLabel, today)
    );
    setActiveTab('workout');
    window.scrollTo(0, 0);
  };

  const handleToggleFavorite = (id: string) => {
    setData((prev) => {
      const favs = prev.favorites ?? [];
      return {
        ...prev,
        favorites: favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id],
      };
    });
  };

  // «Создать свою»: the own workout is added to the list and selected.
  const handleSaveOwn = (plan: WorkoutPlan) => {
    setData((prev) => placeSingle(prev, plan, today));
    setActiveTab('workout');
    window.scrollTo(0, 0);
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
    { id: 'workout', label: t('nav.workout'), icon: Dumbbell },
    { id: 'checkup', label: t('nav.checkup'), icon: Activity },
    { id: 'catalog', label: t('nav.catalog'), icon: BookOpen },
    { id: 'sync', label: t('nav.log'), icon: ClipboardList },
  ];

  return (
    <I18nProvider locale={locale}>
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
                    ? t('theme.toDay')
                    : t('theme.toNight')
                }
                className="tap-scale flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-[#111827] hover:bg-gray-50 dark:border-[#2A3548] dark:bg-[#141A24] dark:text-[#F3F4F6] dark:hover:bg-[#1E293B]"
              >
                {data.theme === 'dark' ? (
                  <>
                    <Moon className="h-4 w-4 text-[#FBBF24]" />
                    <span className="hidden sm:inline">{t('theme.night')}</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4 text-[#D97706]" />
                    <span className="hidden sm:inline">{t('theme.day')}</span>
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
                  <span className="hidden sm:inline">{t('sound.off')}</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 text-[#DC2626] dark:text-[#EF4444]" />
                  <span className="hidden sm:inline">{t('sound.on')}</span>
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
                  ? t('theme.toDay')
                  : t('theme.toNight')
              }
              className="tap-scale flex min-h-[44px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300"
            >
              {data.theme === 'dark' ? (
                <>
                  <Moon className="h-4 w-4 text-[#FBBF24]" />
                  <span>{t('theme.night')}</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 text-[#D97706]" />
                  <span>{t('theme.day')}</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleMute}
            className="tap-scale flex min-h-[44px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300"
            aria-label={data.isMuted ? t('sound.turnOn') : t('sound.turnOff')}
          >
            {data.isMuted ? (
              <VolumeX className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            ) : (
              <Volume2 className="h-4 w-4 text-[#DC2626] dark:text-[#EF4444]" />
            )}
            <span>{data.isMuted ? t('sound.mutedShort') : t('sound.short')}</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <main>
        {isOnboarding && readyPlans && (
          <WeekReadyPanel
            plans={readyPlans}
            exercises={exercises}
            choices={ready?.base.cycles?.length && cycleAt(ready.base.cycles, today) ? ['update', 'today', 'nextWeek'] : ['today', 'nextWeek']}
            choice={ready?.choice ?? 'today'}
            onChoice={handleReadyChoice}
            onCalendar={handleCycleToCalendar}
            onStart={() => {
              setReady(null);
              setActiveTab('workout');
              window.scrollTo(0, 0);
            }}
            onEdit={() => {
              setReady(null);
              setActiveTab('catalog');
              window.scrollTo(0, 0);
            }}
          />
        )}
        {isOnboarding && !readyPlans && (
          <OnboardingWizard
            initial={data.profile}
            onComplete={handleCompleteProfile}
            onCancel={handleDismissOnboarding}
          />
        )}
        {!isOnboarding && activeTab === 'workout' && !data.profile && (
          <div className="mx-auto max-w-6xl px-5 pt-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#0B5F73]/30 bg-[#ECFAFC] p-3 dark:border-[#5EC4D8]/30 dark:bg-[#0B2E36]/60">
              <p className="min-w-0 flex-1 text-sm font-semibold text-[#0B5F73] dark:text-[#5EC4D8]">{t('wiz.banner')}</p>
              <button
                type="button"
                onClick={() => navigate({ name: 'onboarding' })}
                className="tap-scale min-h-[40px] rounded-xl bg-[#0B5F73] px-4 text-sm font-bold text-white"
              >
                {t('wiz.bannerBtn')}
              </button>
            </div>
          </div>
        )}
        {!isOnboarding && activeTab === 'workout' && cycles.length > 0 && (
          <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-5 landscape:px-5">
            <WeekStrip
              days={weekDays}
              kindOf={kindOf}
              titleOf={(id) => planById.get(id)?.title ?? ''}
              selectedDate={selectedDate}
              warning={weekWarning}
              onSelect={handleSelectDay}
              onMove={handleMoveDay}
              onWeek={(delta) => setWeekAnchor((a) => addDays(a, delta * 7))}
              weekLabel={weekLabel}
              onCalendar={data.cycles?.length ? handleCycleToCalendar : undefined}
            />
            {showTopUp && (
              <div className="mt-3 rounded-2xl border border-[#0B5F73]/30 bg-[#ECFAFC] p-3 dark:border-[#5EC4D8]/30 dark:bg-[#0B2E36]/60">
                <p className="text-sm font-semibold text-[#0B5F73] dark:text-[#5EC4D8]">
                  {t('comp.topup', { list: patternList(t, weekReview.missing) })}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={handleAddTopUp} className="tap-scale min-h-[40px] rounded-xl bg-[#0B5F73] px-3 text-sm font-bold text-white">
                    {t('comp.topupAdd')}
                  </button>
                  <button type="button" onClick={() => dismissCard('topup')} className="tap-scale min-h-[40px] rounded-xl px-3 text-sm font-semibold text-[#0B5F73] dark:text-[#5EC4D8]">
                    {t('comp.later')}
                  </button>
                </div>
              </div>
            )}
            {showMonday && note && (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-[#232E42] dark:bg-[#131A26]">
                {note.missing.length > 0 && (
                  <p className="text-sm text-[#111827] dark:text-[#F3F4F6]">
                    {t('comp.monday', { list: patternList(t, note.missing) })}
                    {firstPlanThisWeek && stillMissing.length === 0 && ` ${t('comp.covered', { title: firstPlanThisWeek.title })}`}
                  </p>
                )}
                {note.goShort && <p className="mt-1 text-sm text-[#111827] dark:text-[#F3F4F6]">{t('comp.goShort')}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {stillMissing.length > 0 && firstPlanThisWeek && (
                    <button type="button" onClick={handleTakeInMissing} className="tap-scale min-h-[40px] rounded-xl bg-[#111827] px-3 text-sm font-bold text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]">
                      {t('comp.takeIn', { title: firstPlanThisWeek.title })}
                    </button>
                  )}
                  {note.goShort && (
                    <button type="button" onClick={() => setData((prev) => ({ ...prev, readiness: 'yellow' }))} className="tap-scale min-h-[40px] rounded-xl border border-gray-300 px-3 text-sm font-semibold dark:border-[#334155]">
                      {t('comp.short')}
                    </button>
                  )}
                  <button type="button" onClick={() => dismissCard('monday')} className="tap-scale min-h-[40px] rounded-xl px-3 text-sm font-semibold text-gray-500">
                    {t('comp.later')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {!isOnboarding && activeTab === 'workout' && (
          <WorkoutPreviewTab
            workouts={data.workouts}
            exercises={exercises}
            selectedWorkoutId={data.selectedWorkoutId}
            readiness={data.readiness}
            profile={genProfile}
            accentMinutes={data.accentMinutes}
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
            onChangeAccentMinutes={(accentMinutes) =>
              setData((prev) => ({ ...prev, accentMinutes }))
            }
            onChangeWarmupMinutes={(warmupMinutes) =>
              setData((prev) => ({ ...prev, warmupMinutes }))
            }
            onStartWorkout={handleStartWorkout}
            onResumeWorkout={() => setIsPlayerVisible(true)}
            onDiscardActiveSession={handleDiscardActiveSession}
          />
        )}

        {!isOnboarding && activeTab === 'checkup' && (
          <MePanel
            profile={data.profile}
            exercises={exercises}
            favorites={data.favorites ?? []}
            onToggleFavorite={handleToggleFavorite}
            onEdit={() => navigate({ name: 'onboarding' })}
          />
        )}
        {!isOnboarding && activeTab === 'checkup' && (
          <CheckUpTab
            baseIds={baseCheckupIds(CATALOG, genProfile.usualConditions)}
            exercises={exercises}
            history={data.checkUpHistory}
            isMuted={data.isMuted}
            onRecordCheckUp={handleRecordCheckUp}
          />
        )}

        {!isOnboarding && activeTab === 'catalog' && (
          <GeneratorPanel
            exercises={exercises}
            profile={data.profile}
            logs={data.workoutLogs}
            favorites={data.favorites ?? []}
            onToggleFavorite={handleToggleFavorite}
            onAdd={handleAddGenerated}
            onSaveOwn={handleSaveOwn}
            hasActiveCycle={hasActiveCycle}
          />
        )}
        {!isOnboarding && activeTab === 'catalog' && (
          <CatalogTab
            exercises={exercises}
            onAddExercise={handleAddExercise}
          />
        )}

        {!isOnboarding && activeTab === 'sync' && (
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
        aria-label={t('nav.aria')}
        hidden={isOnboarding}
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
          reminderPrefs={data.reminder}
          onReminderPrefsChange={(reminder) =>
            setData((prev) => ({ ...prev, reminder }))
          }
        />
      )}
    </div>
    </I18nProvider>
  );
}