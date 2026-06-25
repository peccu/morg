import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { useToast } from '@/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // モジュールのシングルトン状態をリセット
    const { toasts, dismiss } = useToast()
    ;[...toasts.value].forEach((t) => dismiss(t.id))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('show() でトーストが追加される', () => {
    const { toasts, show } = useToast()
    show('テスト')
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].message).toBe('テスト')
    expect(toasts.value[0].type).toBe('info')
  })

  test('type を指定できる', () => {
    const { toasts, show } = useToast()
    show('成功', 'success')
    expect(toasts.value[0].type).toBe('success')
  })

  test('3000ms 後に自動削除される', () => {
    const { toasts, show } = useToast()
    show('消えるよ')
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(3000)
    expect(toasts.value).toHaveLength(0)
  })

  test('dismiss() で即時削除できる', () => {
    const { toasts, show, dismiss } = useToast()
    show('手動削除')
    const id = toasts.value[0].id
    dismiss(id)
    expect(toasts.value).toHaveLength(0)
  })

  test('複数のトーストを同時に表示できる', () => {
    const { toasts, show } = useToast()
    show('A')
    show('B')
    show('C')
    expect(toasts.value).toHaveLength(3)
  })

  test('1 つ消えても他のトーストは残る', () => {
    const { toasts, show } = useToast()
    show('長い')
    show('短い')
    const shortId = toasts.value[1].id
    const { dismiss } = useToast()
    dismiss(shortId)
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].message).toBe('長い')
  })
})
