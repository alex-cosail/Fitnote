import React, { useState } from 'react';
import { Bot, Check, UserRound } from 'lucide-react';

interface Props {
  /** Builds the request at the moment of the tap (the latest edits). */
  buildPrompt: () => string;
  onOpenSync?: () => void;
}

/**
 * «Обсудить с моим ИИ-тренером» and «Обсудить с персональным тренером» (our paid AI)
 * (v3.19). The first copies a request for any AI; the answer is pasted on
 * the Sync/Log tab. The second is our tuned AI by subscription (on-the-fly answers, new catalog exercises), coming later.
 */
export const CoachButtons: React.FC<Props> = ({ buildPrompt, onOpenSync }) => {
  const [copied, setCopied] = useState(false);
  const [personal, setPersonal] = useState(false);

  const askAi = async () => {
    const text = buildPrompt();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      try {
        if (typeof navigator.share === 'function') await navigator.share({ title: 'Fitnote — запрос ИИ-тренеру', text });
        setCopied(true);
      } catch {
        // closed — nothing more to do
      }
    }
  };

  const row =
    'tap-scale flex min-h-[52px] w-full items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 text-left text-sm font-semibold text-[#111827] dark:border-[#2A3548] dark:bg-[#131A26] dark:text-[#F3F4F6]';

  return (
    <div className="space-y-2">
      <button type="button" onClick={askAi} className={row}>
        <Bot className="h-4 w-4 shrink-0 text-[#0B5F73] dark:text-[#5EC4D8]" />
        <span className="flex-1">Обсудить с моим ИИ-тренером</span>
        {copied && <Check className="h-4 w-4 text-[#16A34A]" aria-label="Скопировано" />}
      </button>
      {copied && (
        <div className="rounded-xl bg-[#ECFAFC] p-3 text-sm text-[#0B5F73] dark:bg-[#0B2E36]/60 dark:text-[#5EC4D8]" role="status">
          <p className="font-semibold">Запрос скопирован.</p>
          <p className="mt-0.5">
            Вставьте его в ваш ИИ (ChatGPT, Gemini, Claude) и ответьте на его вопросы. Готовый план ИИ попросит вставить на вкладке Sync/Log — он появится в архиве конструктора.
          </p>
          {onOpenSync && (
            <button type="button" onClick={onOpenSync} className="tap-scale mt-1.5 min-h-[36px] text-sm font-bold underline">
              Открыть Sync/Log
            </button>
          )}
        </div>
      )}
      <button type="button" onClick={() => setPersonal((v) => !v)} className={row}>
        <UserRound className="h-4 w-4 shrink-0 text-gray-500" />
        <span className="flex-1">Обсудить с персональным тренером</span>
        <span className="text-xs font-semibold text-gray-500">по подписке</span>
      </button>
      {personal && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 dark:bg-[#1A2333] dark:text-gray-300" role="status">
          Скоро: ваш персональный тренер посмотрит вашу тренировку или серию и ответит в приложении. Будет доступно по подписке.
        </p>
      )}
    </div>
  );
};
