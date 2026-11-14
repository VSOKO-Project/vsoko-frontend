<script setup lang="ts">
defineProps<{ loading?: boolean; error?: string; empty?: boolean }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading" class="empty-state" role="status">Загружаем данные…</div>
  <div v-else-if="error" class="empty-state" role="alert">
    <p>{{ error }}</p>
    <button class="btn btn--primary" @click="$emit('retry')">Повторить</button>
  </div>
  <div v-else-if="empty" class="empty-state">Здесь пока нет данных.</div>
  <slot v-else />
</template>
