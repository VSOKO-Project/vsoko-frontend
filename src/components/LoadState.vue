<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean;
    error?: string;
    empty?: boolean;
    skeleton?: "table" | "cards" | "form" | "dashboard";
  }>(),
  { skeleton: "table" },
);
defineEmits<{ retry: [] }>();
</script>
<template>
  <div
    v-if="loading"
    class="loading-skeleton"
    :class="`loading-skeleton--${skeleton}`"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <span class="sr-only">Загружаем данные</span>
    <div
      v-if="skeleton === 'dashboard'"
      class="skeleton-stats"
      aria-hidden="true"
    >
      <div v-for="n in 4" :key="n" class="skeleton-card">
        <span class="skeleton-block skeleton-label" /><span
          class="skeleton-block skeleton-number"
        />
      </div>
    </div>
    <div class="skeleton-content" aria-hidden="true">
      <div
        v-for="n in skeleton === 'form' ? 3 : skeleton === 'dashboard' ? 2 : 5"
        :key="n"
        class="skeleton-row"
      >
        <span class="skeleton-block skeleton-label" />
        <span class="skeleton-block skeleton-detail" />
        <span
          v-if="skeleton === 'table'"
          class="skeleton-block skeleton-value"
        />
      </div>
    </div>
  </div>
  <div v-else-if="error" class="empty-state" role="alert">
    <p>{{ error }}</p>
    <button class="btn btn--primary" @click="$emit('retry')">Повторить</button>
  </div>
  <div v-else-if="empty" class="empty-state">Здесь пока нет данных.</div>
  <slot v-else />
</template>
<style scoped>
.loading-skeleton {
  width: 100%;
  min-width: 0;
}
.skeleton-block {
  display: block;
  border-radius: 5px;
  background: var(--color-border);
  animation: skeleton-pulse 1.6s ease-in-out infinite;
}
.skeleton-content {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}
.skeleton-row {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 23px 20px;
  min-height: 68px;
}
.skeleton-row + .skeleton-row {
  border-top: 1px solid var(--color-border);
}
.skeleton-label {
  height: 13px;
  width: 32%;
}
.skeleton-detail {
  height: 13px;
  width: 24%;
  margin-left: auto;
}
.skeleton-value {
  height: 13px;
  width: 12%;
}
.skeleton-row:nth-child(even) .skeleton-label {
  width: 25%;
}
.skeleton-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.skeleton-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 22px;
}
.skeleton-card .skeleton-label {
  width: 70%;
}
.skeleton-number {
  width: 40%;
  height: 32px;
  margin-top: 20px;
}
.loading-skeleton--dashboard .skeleton-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  border: 0;
}
.loading-skeleton--dashboard .skeleton-row {
  display: flex;
  align-items: flex-end;
  height: 240px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}
.loading-skeleton--dashboard .skeleton-label {
  width: 40%;
  height: 45%;
}
.loading-skeleton--dashboard .skeleton-detail {
  width: 40%;
  height: 75%;
}
.loading-skeleton--cards .skeleton-row {
  display: grid;
  gap: 14px;
  padding: 24px;
}
.loading-skeleton--cards .skeleton-detail {
  width: 65%;
  margin: 0;
}
.loading-skeleton--form .skeleton-content {
  border: 0;
}
.loading-skeleton--form .skeleton-row {
  display: grid;
  gap: 12px;
  padding: 0 0 22px;
  border: 0;
}
.loading-skeleton--form .skeleton-label {
  width: 120px;
}
.loading-skeleton--form .skeleton-detail {
  width: 100%;
  height: 40px;
  margin: 0;
}
@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.85;
  }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton-block {
    animation: none;
    opacity: 0.6;
  }
}
@media (max-width: 640px) {
  .skeleton-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .loading-skeleton--dashboard .skeleton-content {
    grid-template-columns: 1fr;
  }
  .skeleton-row {
    gap: 16px;
    padding: 20px 16px;
  }
}
</style>
