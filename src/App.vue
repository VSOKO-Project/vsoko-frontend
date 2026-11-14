<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { router } from "./router";
import { auth, homePath } from "./store/auth";
import { logout } from "./api/auth";
import Brand from "./components/Brand.vue";
import ThemeSelect from "./components/ThemeSelect.vue";
const route = useRoute();
const open = ref(false);
const loggingOut = ref(false);
const isAdmin = computed(() => !!auth.session?.data.isAdmin);
const standalone = computed(
  () => route.meta.public || route.path === "/change-password",
);
const links = computed(() =>
  isAdmin.value
    ? [
        ["/dashboard", "Обзор результатов", "◫"],
        ["/teachers/rating", "Оценки преподавателей", "↗"],
        ["/disciplines/rating", "Оценки дисциплин", "▤"],
        ["/feedback", "Отзывы", "◌"],
        ["/teachers", "Преподаватели", "♙"],
        ["/disciplines", "Дисциплины", "▥"],
        ["/criteria", "Критерии", "☷"],
        ["/summaries", "Сводки ИИ", "✧"],
        ["/reports", "Отчёты", "▧"],
        ["/periods", "Периоды", "□"],
        ["/import", "Импорт", "↑"],
      ]
    : [
        ["/workloads", "Оценить занятия", "▤"],
        ["/my-feedback", "Мои оценки", "◌"],
      ],
);
watch(
  () => route.fullPath,
  () => {
    open.value = false;
    document.title = `VSOKO — ${links.value.find((l) => l[0] === route.path)?.[1] || "Качество образования"}`;
  },
);
watch(
  () => auth.version,
  () => {
    const home = homePath();
    if (
      !auth.session ||
      auth.session.data.mustChangePassword ||
      route.path === "/login" ||
      route.path === "/change-password" ||
      (route.meta.admin && !isAdmin.value)
    )
      void router.replace(home);
  },
);
async function exit() {
  loggingOut.value = true;
  try {
    await logout();
  } catch {
    /* Session is cleared before network request. */
  } finally {
    loggingOut.value = false;
  }
}
function escape(event: KeyboardEvent) {
  if (event.key === "Escape") open.value = false;
}
onMounted(() => window.addEventListener("keydown", escape));
onUnmounted(() => window.removeEventListener("keydown", escape));
</script>
<template>
  <RouterView v-if="standalone" :key="route.fullPath" />
  <div v-else class="app-layout">
    <a class="skip-link" href="#main-content">К содержимому</a
    ><button
      v-if="open"
      class="sidebar-overlay"
      aria-label="Закрыть меню"
      @click="open = false"
    />
    <aside class="sidebar" :class="{ 'sidebar--open': open }">
      <RouterLink class="sidebar__logo" :to="homePath()"><Brand /></RouterLink>
      <div class="sidebar__caption">
        {{ isAdmin ? "РАБОЧЕЕ ПРОСТРАНСТВО" : "ЛИЧНЫЙ КАБИНЕТ" }}
      </div>
      <nav class="sidebar__nav" aria-label="Основная навигация">
        <RouterLink
          v-for="link in links"
          :key="link[0]"
          :to="link[0]!"
          class="sidebar__link"
          exact-active-class="sidebar__link--active"
          ><span class="nav-symbol" aria-hidden="true">{{ link[2] }}</span
          >{{ link[1] }}</RouterLink
        >
      </nav>
      <div class="sidebar__footer">
        Обратная связь,<br />которая помогает учиться.
      </div>
    </aside>
    <div class="app-layout__main">
      <header class="header">
        <div class="header__left">
          <button
            class="header__menu-btn"
            :aria-expanded="open"
            aria-label="Открыть меню"
            @click="open = !open"
          >
            ☰</button
          ><span class="header__title">Качество образования</span
          ><span class="header__role">{{
            isAdmin ? "Администратор" : "Студент"
          }}</span>
        </div>
        <div class="header__actions">
          <ThemeSelect /><button
            class="header__logout"
            :disabled="loggingOut"
            @click="exit"
          >
            Выйти ↗
          </button>
        </div>
      </header>
      <main id="main-content" class="app-layout__content" tabindex="-1">
        <RouterView :key="`${route.fullPath}:${auth.version}`" />
        <footer class="app-footer">
          <span>VSOKO · Качество образования</span
          ><span>Данные помогают обсуждать и улучшать.</span>
        </footer>
      </main>
    </div>
  </div>
</template>
