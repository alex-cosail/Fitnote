import { Exercise, WorkoutPlan } from '../../types';
import { formatMetricTarget } from '../format';

// Plain text of a week for the coach (messenger), until links and QR (v3.6).

export interface WeekTextLabels {
  header: string; // "Моя неделя в Fitnote"
  meta: (rounds: number, minutes: number) => string; // "3 кр. · ~45 мин"
  perSide: string; // "на сторону"
}

export function weekText(
  plans: WorkoutPlan[],
  exercises: Exercise[],
  minutesOf: (plan: WorkoutPlan) => number,
  labels: WeekTextLabels
): string {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const lines = [labels.header, ''];
  plans.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.title} — ${labels.meta(p.rounds, minutesOf(p))}`);
    if (p.subtitle) lines.push(`   ${p.subtitle}`);
    for (const it of p.items) {
      const ex = it.exerciseId ? byId.get(it.exerciseId) : undefined;
      if (!ex) continue;
      const paired = ex.isPaired ? ` (${labels.perSide})` : '';
      lines.push(`   • ${ex.name} — ${formatMetricTarget(it.target, ex.metric)}${paired}`);
    }
    lines.push('');
  });
  return lines.join('\n').trimEnd() + '\n';
}
