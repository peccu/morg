import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useQueryClient } from '@tanstack/vue-query'

export const useDemoStore = defineStore('demo', () => {
  const isDemo = ref(false)
  const queryClient = useQueryClient()

  function enter() {
    queryClient.clear()  // discard any cached real email data before showing demo
    isDemo.value = true
  }

  function exit() {
    isDemo.value = false
    queryClient.clear()  // discard demo data so real data is re-fetched after login
  }

  return { isDemo, enter, exit }
})
