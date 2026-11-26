import React, { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Copy, Printer, Share2, X } from 'lucide-react';
import { CATALOG } from '../data/catalog';
import type { Weekday } from '../domain/schedule/schedule';
import { AUDIENCES, Audience, buildPayload, encodePayload, shareUrl } from '../domain/share/share';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n/ru';
import { WorkoutPlan } from '../types';

interface ShareSheetProps {
  plans: WorkoutPlan[];
  title: string;
  defaultAuthor?: string;
  days?: Weekday[];
  onClose: () => void;
}

/** QR as SVG, drawn on the phone (no network). */
export const QrCode: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const path = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 2},${r + 2}h1v1h-1z`;
    return { d, size: n + 4 };
  }, [text]);
  return (
    <svg viewBox={`0 0 ${path.size} ${path.size}`} className={className} role="img" aria-label="QR" shapeRendering="crispEdges">
      <rect width={path.size} height={path.size} fill="#FFFFFF" />
      <path d={path.d} fill="#111827" />
    </svg>
  );
};

/**
 * «Поделиться» (decisions 26.11): for whom and from whom, then a link, a QR
 * and a poster for the playground. The link carries only the structure.
 */
export const ShareSheet: React.FC<ShareSheetProps> = ({ plans, title, defaultAuthor, days, onClose }) => {
  const { t } = useT();
  const [audience, setAudience] = useState<Audience | undefined>(undefined);
  const [author, setAuthor] = useState(defaultAuthor ?? '');
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [poster, setPoster] = useState(false);

  useEffect(() => {
    let alive = true;
    encodePayload(buildPayload(plans, CATALOG, { audience, author, days })).then((enc) => {
      if (alive) setUrl(shareUrl(window.location.origin, enc));
    });
    return () => {
      alive = false;
    };
  }, [plans, audience, author, days]);

  const share = async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      // closed
    }
    copy();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // nothing more
    }
  };

  if (poster) {
    return (
      <div className="fitnote-poster fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-white p-8 text-center text-[#111827]">
        <p className="text-sm font-bold uppercase tracking-widest text-[#DC2626]">Fitnote</p>
        <h1 className="font-display text-4xl font-bold">{title}</h1>
        {(audience || author.trim()) && (
          <p className="text-lg">
            {[audience ? t(`share.aud.${audience}` as TranslationKey) : '', author.trim() ? t('share.from', { name: author.trim() }) : ''].filter(Boolean).join(' · ')}
          </p>
        )}
        {url && <QrCode text={url} className="h-72 w-72" />}
        <p className="max-w-sm text-lg font-semibold">{t('share.posterHint')}</p>
        <div className="fitnote-no-print mt-2 flex gap-2">
          <button type="button" onClick={() => window.print()} className="tap-scale flex min-h-[48px] items-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-bold text-white">
            <Printer className="h-4 w-4" />
            {t('share.print')}
          </button>
          <button type="button" onClick={() => setPoster(false)} className="tap-scale min-h-[48px] rounded-xl border border-gray-300 px-4 text-sm font-semibold">
            {t('share.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-[#0F1520] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('share.title')}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[#111827] dark:text-[#F3F4F6]">{t('share.title')}</h2>
          <button type="button" onClick={onClose} className="tap-scale flex h-10 w-10 items-center justify-center rounded-xl" aria-label={t('share.back')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{title}</p>

        <p className="mt-4 mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('share.forWhom')}</p>
        <div className="flex flex-wrap gap-1.5">
          {AUDIENCES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAudience(audience === a ? undefined : a)}
              className={`tap-scale min-h-[40px] rounded-xl px-3 text-sm font-semibold ${
                audience === a ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]' : 'bg-gray-100 text-gray-600 dark:bg-[#131A26] dark:text-gray-300'
              }`}
            >
              {t(`share.aud.${a}` as TranslationKey)}
            </button>
          ))}
        </div>

        <p className="mt-4 mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('share.fromWhom')}</p>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder={t('share.authorPlaceholder')}
          maxLength={40}
          className="min-h-[46px] w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm dark:border-[#263248] dark:bg-[#131A26] dark:text-[#F3F4F6]"
        />

        <div className="mt-4 flex justify-center rounded-2xl bg-white p-3">
          {url ? <QrCode text={url} className="h-56 w-56" /> : <div className="h-56 w-56" />}
        </div>
        <p className="mt-1 text-center text-xs text-gray-500">{t('share.qrHint')}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={share} className="tap-scale flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl bg-[#DC2626] text-xs font-bold text-white">
            <Share2 className="h-4 w-4" />
            {t('share.send')}
          </button>
          <button type="button" onClick={copy} className="tap-scale flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border border-gray-200 text-xs font-semibold dark:border-[#2A3548]">
            <Copy className="h-4 w-4" />
            {copied ? t('ready.copied') : t('share.copy')}
          </button>
          <button type="button" onClick={() => setPoster(true)} className="tap-scale flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border border-gray-200 text-xs font-semibold dark:border-[#2A3548]">
            <Printer className="h-4 w-4" />
            {t('share.poster')}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('share.privacy')}</p>
      </div>
    </div>
  );
};
