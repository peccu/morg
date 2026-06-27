import { useRegisterSW } from 'virtual:pwa-register/vue'

// 全コンポーネントで needRefresh を共有するためシングルトン化
type AppUpdateState = ReturnType<typeof useRegisterSW>
let _state: AppUpdateState | null = null

export function useAppUpdate() {
  if (!_state) {
    _state = useRegisterSW({
      onRegistered(registration: ServiceWorkerRegistration | undefined) {
        // 1時間ごとに新バージョンを能動的にチェック
        if (registration) {
          setInterval(() => registration.update(), 60 * 60 * 1000)
        }
      },
    })
  }
  return _state
}
