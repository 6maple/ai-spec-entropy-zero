import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { zhCN } from '@/locales/zh-CN';

type Messages = typeof zhCN;

function getByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

const I18nContext = createContext<{
  t: (key: string) => string;
  locale: 'zh-CN';
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const t = useCallback((key: string) => {
    const v = getByPath(zhCN as unknown as Messages, key);
    return v ?? key;
  }, []);

  return (
    <I18nContext.Provider value={{ t, locale: 'zh-CN' }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used under I18nProvider');
  return ctx;
}
