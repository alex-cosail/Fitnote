/**
 * Checks a file of new catalog exercises before it goes into the app.
 *
 *   npm run catalog:check -- docs/catalog/new-exercises.json
 *
 * File format (see docs/CATALOG_TEMPLATE.md):
 *   { "exercises": [ { ...CatalogExercise, "text": { "ru": {name, cue, details}, "en"?: …, "tr"?: … } } ] }
 */
import { readFileSync } from 'node:fs';
import { CATALOG } from '../src/data/catalog';
import { CatalogExercise, CatalogText } from '../src/domain/catalog/types';
import { validateCatalog } from '../src/domain/catalog/validate';

type Entry = CatalogExercise & { text?: Partial<Record<'ru' | 'en' | 'tr', CatalogText>> };

const file = process.argv[2];
if (!file) {
  console.error('Укажите файл: npm run catalog:check -- путь/к/файлу.json');
  process.exit(2);
}

let parsed: { exercises?: Entry[] };
try {
  parsed = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`Не удалось прочитать ${file}: ${(e as Error).message}`);
  process.exit(2);
}

const entries = Array.isArray(parsed.exercises) ? parsed.exercises : [];
if (entries.length === 0) {
  console.error('В файле нет массива "exercises" или он пустой.');
  process.exit(2);
}

const texts: Record<string, CatalogText> = {};
for (const e of entries) if (e.id && e.text?.ru) texts[e.id] = e.text.ru;
const catalogEntries = entries.map(({ text, ...rest }) => rest as CatalogExercise);

const issues = validateCatalog(catalogEntries, texts, CATALOG);
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');

for (const i of issues) {
  console.log(`${i.level === 'error' ? '✗' : '!'} ${i.id}: ${i.message}`);
}

// Coverage after adding the file: patterns × environments × ranks.
const all = [...CATALOG, ...catalogEntries];
console.log('\nПокрытие (каталог + файл), число упражнений по ступеням 1..5:');
for (const env of ['outdoor', 'home'] as const) {
  console.log(`  ${env === 'outdoor' ? 'Площадка' : 'Дом'}:`);
  for (const p of ['push_h', 'pull_h', 'push_v', 'pull_v', 'squat', 'hinge', 'lunge', 'core'] as const) {
    const counts = [1, 2, 3, 4, 5].map(
      (r) => all.filter((c) => c.pattern === p && c.rank === r && c.environments?.includes(env)).length
    );
    const gaps = counts.filter((n) => n === 0).length;
    console.log(`    ${p.padEnd(7)} ${counts.join(' ')}${gaps ? `   (пустых ступеней: ${gaps})` : ''}`);
  }
}

console.log(
  `\nУпражнений в файле: ${entries.length}. Ошибок: ${errors.length}. Предупреждений: ${warnings.length}.`
);
process.exit(errors.length > 0 ? 1 : 0);
