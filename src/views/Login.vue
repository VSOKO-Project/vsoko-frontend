<script setup lang="ts">
import { reactive, ref } from "vue";
import { showPasswordResetNotice } from "../utils/features";
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
const resetNoticeVisible = !props.changePassword && showPasswordResetNotice();
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
      <div class="login-stack">
        <p v-if="resetNoticeVisible" class="login-notice">
          После переезда на новый сервер пароли сброшены до первоначальных.
          Войдите с паролем для первого входа.
        </p>
        <section class="login-card">
          <h2>{{ changePassword ? "Смена пароля" : "Вход в VSOKO" }}</h2>
          <p class="login-card__subtitle">
            {{
              changePassword
                ? "Придумайте новый пароль для вашей учётной записи."
                : "Войдите с учётной записью университета."
            }}
          </p>
          <form class="login-card__form" @submit.prevent="submit">
            <label v-if="!changePassword" class="field"
              >Логин<input
                v-model="form.login"
                autocomplete="username"
                placeholder="Ваш логин"
                required
            /></label>
            <div class="field">
              <label for="login-password">{{
                changePassword ? "Текущий (временный) пароль" : "Пароль"
              }}</label>
              <div class="password-control">
                <input
                  id="login-password"
                  v-model="form.password"
                  :type="visible ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="Ваш пароль"
                  required
                />
                <button
                  type="button"
                  class="password-visibility"
                  :aria-label="visible ? 'Скрыть пароль' : 'Показать пароль'"
                  :title="visible ? 'Скрыть пароль' : 'Показать пароль'"
                  :aria-pressed="visible"
                  @click="visible = !visible"
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                    />
                    <circle cx="12" cy="12" r="3" />
                    <path v-if="visible" d="m3 3 18 18" />
                  </svg>
                </button>
              </div>
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
            </button>
          </form>
          <p class="login-help">
            Не получается войти?<br />Обратитесь к администратору вашего
            университета.
          </p>
        </section>
      </div>
    </main>
  </div>
</template>
