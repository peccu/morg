import { useRegisterSW } from 'virtual:pwa-register/vue'

export function useAppUpdate() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegistered(registration: ServiceWorkerRegistration | undefined) {
      // 1時間ごとに新バージョンを能動的にチェック
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000)
      }
    },
  })

  return { needRefresh, updateServiceWorker }
}
