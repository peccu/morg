<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="p-6">
    <p class="text-gray-500 text-sm">Thread {{ route.params.id }}（実装予定）</p>
  </div>
</template>
