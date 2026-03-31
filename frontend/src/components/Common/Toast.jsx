import React, { useState, useEffect } from 'react';

let toastFn = null;

export const toast = {
  success: (msg) => toastFn?.('success', msg),
  error:   (msg) => toastFn?.('error', msg),
  info:    (msg) => toastFn?.('info', msg),
  warn:    (msg) => toastFn?.('warn', msg),
};

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastFn = (type, msg) => {
      const id = Date.now();
      setToasts(p => [...p, { id, type, msg }]);
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
    };
    return () => { toastFn = null; };
  }, []);

  const icons = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' };
  const colors = {
    success: 'bg-emerald-500',
    error:   'bg-red-500',
    info:    'bg-blue-500',
    warn:    'bg-amber-500',
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`${colors[t.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-64 max-w-sm pointer-events-auto animate-slide-in`}>
          <span className="font-bold text-lg leading-none">{icons[t.type]}</span>
          <span className="text-sm font-medium flex-1">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
