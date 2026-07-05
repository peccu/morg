import { onMounted, onUnmounted } from 'vue'

// Approximate traffic light button dimensions on iPadOS Stage Manager
const TRAFFIC_LIGHT_W = 80  // px (3 buttons + padding ~= 68–80px)
const TRAFFIC_LIGHT_H = 28  // px

interface WCONavigator extends Navigator {
  windowControlsOverlay: {
    visible: boolean
    getTitlebarAreaRect(): DOMRect
    addEventListener(type: string, fn: () => void): void
    removeEventListener(type: string, fn: () => void): void
  }
}

function applyVars(): void {
  const root = document.documentElement

  // Chromium WCO API (Windows/macOS Chrome/Edge)
  if ('windowControlsOverlay' in navigator) {
    const wco = (navigator as WCONavigator).windowControlsOverlay
    if (wco.visible) {
      const r = wco.getTitlebarAreaRect()
      root.style.setProperty('--wsa-left', `${r.x}px`)
      root.style.setProperty('--wsa-top', `${r.height}px`)
      return
    }
  }

  // iPadOS Stage Manager fallback: window.screenY is always 0 on Safari/iPadOS
  // so we cannot reliably detect the window-at-top condition.
  // Traffic lights are at the top-LEFT corner; shifting content 80px right
  // is sufficient — no vertical (top) adjustment is needed because the 52px
  // header already provides enough vertical space for the 28px traffic lights.
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  if (isStandalone) {
    root.style.setProperty('--wsa-left', `${TRAFFIC_LIGHT_W}px`)
  } else {
    root.style.setProperty('--wsa-left', '0px')
  }
  root.style.setProperty('--wsa-top', '0px')
}

export function useWindowSafeArea(): void {
  let intervalId: ReturnType<typeof setInterval>

  onMounted(() => {
    applyVars()
    window.addEventListener('resize', applyVars)
    window.addEventListener('focus', applyVars)
    // Poll every 2 s to catch Stage Manager window repositioning (no position-change event)
    intervalId = setInterval(applyVars, 2000)

    if ('windowControlsOverlay' in navigator) {
      ;(navigator as WCONavigator).windowControlsOverlay.addEventListener('geometrychange', applyVars)
    }
  })

  onUnmounted(() => {
    clearInterval(intervalId)
    window.removeEventListener('resize', applyVars)
    window.removeEventListener('focus', applyVars)
    if ('windowControlsOverlay' in navigator) {
      ;(navigator as WCONavigator).windowControlsOverlay.removeEventListener('geometrychange', applyVars)
    }
  })
}
