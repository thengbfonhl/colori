import { getLocales } from 'expo-localization';
import { en } from './en';
import { vi, type MessageKey } from './vi';

export type Language = 'vi' | 'en';
export type { MessageKey };
export type TranslateParams = Record<string, string | number>;

const MESSAGES: Record<Language, Record<MessageKey, string>> = { vi, en };

/** Vietnamese if the device is set to Vietnamese, English for any other language. */
export function detectLanguage(): Language {
  return getLocales()[0]?.languageCode === 'vi' ? 'vi' : 'en';
}

/** `translate('en', 'tab.draw')`; `{name}` placeholders are replaced from `params`. */
export function translate(lang: Language, key: MessageKey, params?: TranslateParams): string {
  const text = MESSAGES[lang][key] ?? vi[key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}
