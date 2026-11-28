import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CoachButtons } from './CoachButtons';

interface Props {
  title: string;
  /** Builds the request with the person's own words. */
  buildPrompt: (request: string) => string;
  onOpenSync: () => void;
  onClose: () => void;
}

/**
 * «Обсудить с ИИ-тренером» for any workout or series (v3.19.1): first the
 * person says what to change («нужны подводящие»), then the request goes to
 * any AI; the answer comes back through Sync/Log into the archive.
 */
export const AiCoachSheet: React.FC<Props> = ({ title, buildPrompt, onOpenSync, onClose }) => {
  const [request, setRequest] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 sm:rounded-3xl dark:bg-[#0F1520]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Обсудить с ИИ-тренером"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Обсудить с ИИ-тренером</p>
            <h3 className="text-lg font-bold text-[#111827] dark:text-[#F3F4F6]">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500" aria-label="Закрыть">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="mt-3 block text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]" htmlFor="ai-request">
          Что хотите поменять?
        </label>
        <textarea
          id="ai-request"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={3}
          maxLength={400}
          placeholder="Например: уровень для акцента оказался выше моего — нужны подводящие упражнения"
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-[#263248] dark:bg-[#131A26] dark:text-[#F3F4F6]"
        />
        <p className="mt-1 mb-3 text-xs text-gray-500 dark:text-gray-400">Можно оставить пустым — ИИ сам спросит.</p>
        <CoachButtons buildPrompt={() => buildPrompt(request)} onOpenSync={onOpenSync} />
      </div>
    </div>
  );
};
