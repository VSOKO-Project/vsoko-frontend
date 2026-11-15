<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <div class="page-header" :class="{ 'page-header--with-actions': $slots.actions }">
    <div class="page-header__text">
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="subtitle || $slots.default" class="page-subtitle"><slot>{{ subtitle }}</slot></p>
    </div>
    <slot name="actions" />
  </div>
</template>
