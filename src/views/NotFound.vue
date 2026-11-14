<script setup lang="ts">
import { homePath } from "../store/auth";
</script>
<template>
  <main class="error-page">
    <span class="eyebrow">404 · СТРАНИЦА НЕ НАЙДЕНА</span>
    <h1>Мы не нашли эту страницу</h1>
    <p>
      Возможно, ссылка устарела или страницу перенесли. Вернитесь на главную,
      чтобы продолжить работу.
    </p>
    <RouterLink class="btn btn--primary" :to="homePath()"
      >На главную</RouterLink
    >
  </main>
</template>
