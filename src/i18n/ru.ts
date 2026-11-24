// Russian UI strings — the source of keys. en.ts and tr.ts must have exactly
// the same keys (the compiler checks it via `Dict`).
// New screens use t('key'); existing screens move over in step 4.
export const ru = {
  'nav.workout': 'Workout',
  'nav.checkup': 'Check-Up',
  'nav.catalog': 'Catalog',
  'nav.log': 'Sync / Log',
  'nav.aria': 'Основная навигация',
  'theme.day': 'День',
  'theme.night': 'Ночь',
  'theme.toDay': 'Включить дневную светлую тему',
  'theme.toNight': 'Включить вечернюю тёмную тему',
  'sound.on': 'Звук вкл',
  'sound.off': 'Звук выкл',
  'sound.short': 'Звук',
  'sound.mutedShort': 'Mute',
  'sound.turnOn': 'Включить звук',
  'sound.turnOff': 'Выключить звук',
  'common.roundsCount': '{count} кр.',
};

export type Dict = Record<keyof typeof ru, string>;
export type TranslationKey = keyof typeof ru;
