import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setLocale } from '@/i18n'
import LoginView from '@/views/LoginView.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  setLocale('ja')
  vi.restoreAllMocks()
})

describe('LoginView', () => {
  test('renders app name and landing content', () => {
    const wrapper = mount(LoginView)
    expect(wrapper.text()).toContain('morg')
    expect(wrapper.text()).toContain('Gmail')
  })

  test('renders Google login button', () => {
    const wrapper = mount(LoginView)
    expect(wrapper.text()).toContain('Googleアカウントでログイン')
  })

  test('shows spinner and navigates to Google URL on login', async () => {
    const googleUrl = 'https://accounts.google.com/o/oauth2/v2/auth?test=1'
    const body = JSON.stringify({ url: googleUrl })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(body),
    }))
    const mockLocation = { href: '' }
    vi.stubGlobal('location', mockLocation)

    const wrapper = mount(LoginView)
    const clickPromise = wrapper.find('[data-testid="login-btn"]').trigger('click')

    // クリック直後（fetch完了前）はスピナーが表示される
    await wrapper.vm.$nextTick()
    expect(wrapper.find('svg.animate-spin').exists()).toBe(true)

    await clickPromise
    await flushPromises()

    // Google の URL に遷移していること
    expect(mockLocation.href).toBe(googleUrl)
  })

  test('shows error message when login fails', async () => {
    const body = JSON.stringify({ error: '環境変数が未設定です' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(body),
    }))

    const wrapper = mount(LoginView)
    await wrapper.find('[data-testid="login-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('ログインに失敗しました')
    expect(wrapper.text()).toContain('環境変数が未設定です')
  })

  test('shows raw response when server returns non-JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: () => Promise.resolve('<html>Bad Gateway</html>'),
    }))

    const wrapper = mount(LoginView)
    await wrapper.find('[data-testid="login-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('ログインに失敗しました')
    expect(wrapper.text()).toContain('サーバーレスポンスが不正です')
  })

  test('language toggle button switches locale', async () => {
    const wrapper = mount(LoginView)
    // 初期状態は JA
    const langBtn = wrapper.find('nav button')
    expect(langBtn.text()).toBe('JA')

    await langBtn.trigger('click')
    expect(langBtn.text()).toBe('EN')
    expect(wrapper.text()).toContain('Sign in with Google')
  })
})
