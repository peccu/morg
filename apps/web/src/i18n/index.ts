import { createI18n } from 'vue-i18n'
import ja from './ja'
import en from './en'

export const SUPPORTED_LOCALES = ['ja', 'en'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

const LOCALE_KEY = 'morg-locale'

function detectLocale(): SupportedLocale {
  const saved = localStorage.getItem(LOCALE_KEY)
  if (saved && SUPPORTED_LOCALES.includes(saved as SupportedLocale)) return saved as SupportedLocale
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('ja')) return 'ja'
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'ja',
  messages: { ja, en },
})

export function setLocale(locale: SupportedLocale) {
  ;(i18n.global.locale as { value: string }).value = locale
  localStorage.setItem(LOCALE_KEY, locale)
}

export function getLocale(): SupportedLocale {
  return (i18n.global.locale as { value: string }).value as SupportedLocale
}
