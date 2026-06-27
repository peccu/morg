import { config } from '@vue/test-utils'
import { i18n, setLocale } from '@/i18n'

setLocale('ja')
config.global.plugins = [i18n]
