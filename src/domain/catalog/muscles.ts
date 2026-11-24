export const MUSCLE_LABELS: Record<string, string> = {
  lats: 'Широчайшие',
  biceps: 'Бицепс',
  chest: 'Грудь',
  triceps: 'Трицепс',
  front_delts: 'Передние дельты',
  rear_delts: 'Задние дельты',
  upper_back: 'Верх спины',
  quads: 'Квадрицепс',
  glutes: 'Ягодицы',
  hamstrings: 'Бицепс бедра',
  hip_flexors: 'Сгибатели бедра',
  obliques: 'Косые мышцы',
  core: 'Кор',
  lower_back: 'Поясница',
  forearms: 'Предплечья',
  spine_decompression: 'Декомпрессия позвоночника',
  shoulder_press: 'Плечи (жим)',
};

export function getMuscleLabel(tag: string): string {
  return MUSCLE_LABELS[tag] ?? tag;
}
