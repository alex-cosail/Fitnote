import React from 'react';

export const ExitConfirmModal: React.FC<{
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/70">
    <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl dark:border dark:border-[#232E42] dark:bg-[#131A26]">
      <h3 className="text-lg font-bold text-[#111827] dark:text-[#F3F4F6]">
        Поставить на паузу и выйти?
      </h3>
      <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
        Прогресс текущей тренировки сохранён локально — вы сможете продолжить с
        того же места.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="tap-scale min-h-[46px] rounded-xl border border-gray-300 bg-white text-sm font-semibold text-[#111827] dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
        >
          Остаться
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="tap-scale min-h-[46px] rounded-xl bg-[#111827] text-sm font-semibold text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]"
        >
          Свернуть
        </button>
      </div>
    </div>
  </div>
);
