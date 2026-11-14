<script setup lang="ts">
import { reactive, ref } from "vue";
import Brand from "../components/Brand.vue";
import ThemeSelect from "../components/ThemeSelect.vue";
import { login, changePassword as updatePassword } from "../api/auth";
import { useAction } from "../composables/resource";
const props = defineProps<{ changePassword?: boolean }>();
const form = reactive({
  login: "",
  password: "",
  newPassword: "",
  confirm: "",
});
const visible = ref(false);
const mismatch = ref("");
const { pending, error, run } = useAction();
async function submit() {
  mismatch.value = "";
  if (props.changePassword && form.newPassword !== form.confirm) {
    mismatch.value = "Пароли не совпадают";
    return;
  }
  await run(() =>
    props.changePassword
      ? updatePassword({
          currentPassword: form.password,
          newPassword: form.newPassword,
        })
      : login({ login: form.login, password: form.password }),
  );
}
</script>
<template>
  <div class="login-page">
    <header class="login-top"><Brand /><ThemeSelect /></header>
    <main class="login-main">
      <section class="login-intro">
        <span class="eyebrow">КАЧЕСТВО ОБРАЗОВАНИЯ НАЧИНАЕТСЯ С ДИАЛОГА</span>
        <h1>Ваш опыт.<br />Общие перемены.</h1>
        <p>
          Спокойный инструмент для честной оценки качества образования.
          Помогайте делать занятия лучше — шаг за шагом.
        </p>
        <div class="login-principles">
          <div>
            <span class="intro-symbol">◌</span
            ><span
              ><strong>Расскажите о занятиях</strong>Оцените преподавание и
              поделитесь впечатлениями.</span
            >
          </div>
          <div>
            <span class="intro-symbol">↗</span
            ><span
              ><strong>Увидьте общую картину</strong>Обратная связь помогает
              находить точки роста.</span
            >
          </div>
          <div>
            <span class="intro-symbol">▤</span
            ><span
              ><strong>Меняйте образование</strong>Ваши оценки помогают
              принимать решения.</span
            >
          </div>
        </div>
        <div class="login-intro__note">
          Внутренняя система оценки качества образования
        </div>
      </section>
      <section class="login-card">
        <span class="eyebrow">ЛИЧНЫЙ КАБИНЕТ</span>
        <h2>{{ changePassword ? "Смена пароля" : "Рады вас видеть" }}</h2>
        <p class="login-card__subtitle">
          {{
            changePassword
              ? "Придумайте новый пароль для вашей учётной записи."
              : "Войдите с учётной записью университета."
          }}
        </p>
        <p v-if="!changePassword" class="login-notice">
          После переезда на новый сервер пароли сброшены до первоначальных.
          Войдите с паролем для первого входа.
        </p>
        <form class="login-card__form" @submit.prevent="submit">
          <label v-if="!changePassword" class="field"
            >Логин<input
              v-model="form.login"
              autocomplete="username"
              placeholder="Ваш логин"
              required
          /></label>
          <div>
            <label class="field"
              >{{ changePassword ? "Текущий (временный) пароль" : "Пароль"
              }}<input
                v-model="form.password"
                :type="visible ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Ваш пароль"
                required /></label
            ><button
              class="password-toggle"
              type="button"
              :aria-pressed="visible"
              @click="visible = !visible"
            >
              {{ visible ? "Скрыть пароль" : "Показать пароль" }}
            </button>
          </div>
          <template v-if="changePassword"
            ><label class="field"
              >Новый пароль<input
                v-model="form.newPassword"
                type="password"
                autocomplete="new-password"
                pattern="(?=.*[A-Z])(?=.*[0-9]).{6,}"
                title="От 6 символов, заглавная латинская буква и цифра"
                required
            /></label>
            <p class="muted">
              Не менее 6 символов, заглавная латинская буква и цифра.
            </p>
            <label class="field"
              >Повторите новый пароль<input
                v-model="form.confirm"
                type="password"
                autocomplete="new-password"
                required /></label
          ></template>
          <p v-if="error || mismatch" class="login-card__error" role="alert">
            {{ mismatch || error }}
          </p>
          <button
            type="submit"
            class="btn btn--primary login-card__btn"
            :disabled="pending"
          >
            {{
              pending
                ? "Подождите…"
                : changePassword
                  ? "Сменить пароль"
                  : "Войти в кабинет"
            }}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <p class="login-help">
          Не получается войти?<br />Обратитесь к администратору вашего
          университета.
        </p>
      </section>
    </main>
    <footer class="login-bottom">
      <span>VSOKO · Образование через обратную связь</span
      ><span>Ясность. Доверие. Развитие.</span>
    </footer>
  </div>
</template>
