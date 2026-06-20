import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginView from '@/views/LoginView.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

describe('LoginView', () => {
  test('renders app name and subtitle', () => {
    const wrapper = mount(LoginView)
    expect(wrapper.text()).toContain('morg')
    expect(wrapper.text()).toContain('Mail Organizer')
  })

  test('renders Google login button', () => {
    const wrapper = mount(LoginView)
    expect(wrapper.text()).toContain('Googleアカウントでログイン')
  })

  test('shows spinner and navigates to Google URL on login', async () => {
    const googleUrl = 'https://accounts.google.com/o/oauth2/v2/auth?test=1'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: googleUrl }),
    }))
    const mockLocation = { href: '' }
    vi.stubGlobal('location', mockLocation)

    const wrapper = mount(LoginView)
    await wrapper.find('button').trigger('click')

    // スピナーが出ることを確認
    expect(wrapper.find('svg.animate-spin').exists()).toBe(true)

    await flushPromises()

    // Google の URL に遷移していること
    expect(mockLocation.href).toBe(googleUrl)
  })

  test('shows error message when login fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: '環境変数が未設定です' }),
    }))

    const wrapper = mount(LoginView)
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('ログインに失敗しました')
    expect(wrapper.text()).toContain('環境変数が未設定です')
  })
})
