<script setup lang="ts">
defineProps<{ name: 'edit' | 'delete' | 'merge' }>();
</script>
<template>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <template v-if="name === 'edit'"><path d="m16 3 5 5L8 21H3v-5Z" /><path d="m14 5 5 5" /></template>
    <template v-else-if="name === 'merge'"><path d="M6 3v4a5 5 0 0 0 5 5h8M6 21v-4a5 5 0 0 1 5-5M15 8l4 4-4 4" /></template>
    <template v-else><path d="M3 6h18M9 6V4h6v2M5 6l1 15h12l1-15M10 10v7M14 10v7" /></template>
  </svg>
</template>
