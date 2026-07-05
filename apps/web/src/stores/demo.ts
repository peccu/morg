import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useDemoStore = defineStore('demo', () => {
  const isDemo = ref(false)

  function enter() { isDemo.value = true }
  function exit() { isDemo.value = false }

  return { isDemo, enter, exit }
})
