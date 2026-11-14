<script setup lang="ts">
defineProps<{ page: number; total: number }>();
defineEmits<{ "update:page": [page: number] }>();
</script>
<template>
  <nav v-if="total > 1" class="pagination" aria-label="Страницы">
    <button
      class="btn btn--secondary"
      :disabled="page <= 1"
      @click="$emit('update:page', page - 1)"
    >
      Назад</button
    ><span>Страница {{ page }} из {{ total }}</span
    ><button
      class="btn btn--secondary"
      :disabled="page >= total"
      @click="$emit('update:page', page + 1)"
    >
      Далее
    </button>
  </nav>
</template>
