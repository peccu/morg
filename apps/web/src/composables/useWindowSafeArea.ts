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

  // iPadOS Stage Manager fallback.
  // Traffic lights only appear on iPad (Stage Manager), never on iPhone.
  // Smallest iPad short-side: 744 px (iPad mini 6th gen).
  // Largest iPhone short-side: 430 px (iPhone Pro Max).
  // Using screen.width/height (physical screen, not window) to tell them apart.
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isIpad = Math.min(screen.width, screen.height) > 500
  if (isStandalone && isIpad) {
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
