import { ar } from './ar';
import { en } from './en';

export type AppLanguage = 'en' | 'ar';

type Dictionary = Record<string, string>;

const dictionaries: Record<AppLanguage, Dictionary> = {
  en,
  ar,
};

const defaultLanguage: AppLanguage = 'en';

export function resolveLanguage(language?: string | null): AppLanguage {
  return language === 'ar' ? 'ar' : 'en';
}

export function translate(key: string, language?: string | null, fallback?: string): string {
  const resolved = resolveLanguage(language) || defaultLanguage;
  const active = dictionaries[resolved] ?? dictionaries[defaultLanguage];
  const safeDefault = dictionaries[defaultLanguage];

  return active[key] ?? safeDefault[key] ?? fallback ?? key;
}

export function getTranslator(language?: string | null) {
  return (key: string, fallback?: string) => translate(key, language, fallback);
}
