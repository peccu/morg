import { ref, readonly } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

// モジュールレベルのシングルトン（全コンポーネントで共有）
const toasts = ref<Toast[]>([])
let _nextId = 0

const DURATION_MS = 3000

export function useToast() {
  function show(message: string, type: Toast['type'] = 'info') {
    const id = _nextId++
    toasts.value = [...toasts.value, { id, message, type }]
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, DURATION_MS)
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts: readonly(toasts), show, dismiss }
}
