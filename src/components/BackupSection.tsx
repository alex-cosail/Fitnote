import React, { useRef, useState } from 'react';
import { Archive, RotateCcw, ShieldCheck } from 'lucide-react';
import {
  BackupSummary,
  backupFileName,
  buildBackup,
  entriesSinceBackup,
  parseBackup,
} from '../storage/backup';
import { FitnoteData } from '../types';

interface BackupSectionProps {
  data: FitnoteData;
  onBackupSaved: (isoTime: string) => void;
  onRestore: (data: FitnoteData) => void;
}

const REMIND_AFTER_ENTRIES = 5;

const formatDay = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

/**
 * Save / restore a full copy of the journal as a file. On phones the system
 * share sheet is used, so the copy can go to Files, Drive or a messenger.
 */
export const BackupSection: React.FC<BackupSectionProps> = ({
  data,
  onBackupSaved,
  onRestore,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);
  const [pending, setPending] = useState<{ data: FitnoteData; summary: BackupSummary } | null>(null);

  const since = entriesSinceBackup(data);
  const needsBackup = since >= REMIND_AFTER_ENTRIES || (!data.lastBackupAt && since > 0);

  const handleSave = async () => {
    setStatus(null);
    const now = Date.now();
    const text = JSON.stringify(buildBackup(data, now), null, 2);
    const name = backupFileName(now);
    const file = new File([text], name, { type: 'application/json' });

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Fitnote — резервная копия' });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      }
      onBackupSaved(new Date(now).toISOString());
      setStatus({ type: 'ok', message: 'Копия сохранена. Храните файл вне телефона: в облаке или в мессенджере.' });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return; // user closed the share sheet
      setStatus({ type: 'err', message: 'Не удалось сохранить копию.' });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setStatus(null);
    const res = parseBackup(await file.text());
    if (!res.ok) {
      setPending(null);
      setStatus({ type: 'err', message: res.error });
      return;
    }
    setPending({ data: res.data, summary: res.summary });
  };

  const confirmRestore = () => {
    if (!pending) return;
    onRestore(pending.data);
    setPending(null);
    setStatus({ type: 'ok', message: 'Данные восстановлены из копии.' });
  };

  return (
    <section
      className={`rounded-2xl border p-4 ${
        needsBackup
          ? 'border-[#D97706]/40 bg-[#FFFBEB] dark:border-[#FBBF24]/40 dark:bg-[#451A03]/40'
          : 'border-gray-200 bg-white dark:border-[#232E42] dark:bg-[#131A26]'
      }`}
    >
      <div className="flex items-start gap-2">
        <ShieldCheck
          className={`mt-0.5 h-5 w-5 shrink-0 ${
            needsBackup ? 'text-[#D97706] dark:text-[#FBBF24]' : 'text-[#16A34A] dark:text-[#4ADE80]'
          }`}
        />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
            Резервная копия
          </h2>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
            Последняя копия: {formatDay(data.lastBackupAt)}
            {since > 0 && ` · новых записей с тех пор: ${since}`}
          </p>
          {needsBackup && (
            <p className="mt-1 text-xs font-semibold text-[#B45309] dark:text-[#FBBF24]">
              Журнал хранится только в этом телефоне — сохраните копию.
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFile}
        className="hidden"
      />

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleSave}
          className="tap-scale flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-[#111827] px-3 text-xs font-bold text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]"
        >
          <Archive className="h-4 w-4 shrink-0" />
          Сохранить копию
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="tap-scale flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-[#111827] dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
        >
          <RotateCcw className="h-4 w-4 shrink-0" />
          Восстановить
        </button>
      </div>

      {pending && (
        <div className="mt-3 rounded-xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-xs dark:border-[#EF4444]/40 dark:bg-[#450A0A]/45">
          <p className="font-bold text-[#111827] dark:text-[#F3F4F6]">
            Копия от {formatDay(pending.summary.exportedAt)}
          </p>
          <p className="mt-1 text-gray-700 dark:text-gray-200">
            Тренировок: {pending.summary.workouts} · кардио: {pending.summary.cardio} · чек-апов:{' '}
            {pending.summary.checkUps} · планов: {pending.summary.plans}
            {pending.summary.lastWorkoutDate &&
              ` · последняя запись ${formatDay(pending.summary.lastWorkoutDate)}`}
          </p>
          <p className="mt-1 font-semibold text-[#B91C1C] dark:text-[#F87171]">
            Текущие данные на телефоне будут заменены данными из копии.
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="tap-scale min-h-[44px] rounded-xl border border-gray-300 bg-white font-bold text-[#111827] dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={confirmRestore}
              className="tap-scale min-h-[44px] rounded-xl bg-[#DC2626] font-bold text-white"
            >
              Восстановить
            </button>
          </div>
        </div>
      )}

      {status && (
        <p
          className={`mt-2 text-xs font-semibold ${
            status.type === 'ok' ? 'text-[#16A34A] dark:text-[#4ADE80]' : 'text-[#DC2626] dark:text-[#F87171]'
          }`}
        >
          {status.message}
        </p>
      )}
    </section>
  );
};
