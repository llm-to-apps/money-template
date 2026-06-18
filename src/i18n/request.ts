import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import {
  defaultLocale,
  isLocale,
  localeCookieName,
  localeHeaderName,
  localeFromAcceptLanguage
} from '@/i18n/locales';

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const headerLocale = headerStore.get(localeHeaderName);
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale =
    headerLocale && isLocale(headerLocale)
      ? headerLocale
      : cookieLocale && isLocale(cookieLocale)
        ? cookieLocale
        : localeFromAcceptLanguage(headerStore.get('accept-language'));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});

export { defaultLocale };
