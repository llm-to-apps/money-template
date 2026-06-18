export const locales = ['en', 'de', 'ru'] as const;
export const defaultLocale = 'en';
export const localeCookieName = 'money-locale';
export const localeHeaderName = 'x-money-locale';
export const localeSearchParamHeaderName = 'x-money-locale-search-param';
export const localeSearchParamName = 'lang';

export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function localeFromAcceptLanguage(value: string | null) {
  if (!value) {
    return defaultLocale;
  }

  const requestedLocales = value
    .split(',')
    .map((part) => part.split(';')[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const requestedLocale of requestedLocales) {
    const language = requestedLocale.split('-')[0];

    if (language && isLocale(language)) {
      return language;
    }
  }

  return defaultLocale;
}
