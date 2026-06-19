import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginView from '@/views/LoginView.vue'

beforeEach(() => {
  setActivePinia(createPinia())
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

  test('calls auth.login() on button click', async () => {
    const wrapper = mount(LoginView)
    // window.location.href の書き換えをモック
    const mockLocation = { href: '' }
    vi.stubGlobal('location', mockLocation)

    const button = wrapper.find('button')
    await button.trigger('click')

    expect(mockLocation.href).toBe('/.netlify/functions/auth-google')
  })
})
