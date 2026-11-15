<script setup lang="ts">
import MultiSelectPicker from "../components/MultiSelectPicker.vue";
import PageHeader from "../components/PageHeader.vue";
import { ref } from "vue";
import { downloadCredentials, getImportGroups } from "../api/import";
import { useAction, useResource } from "../composables/resource";
import { saveBlob } from "../utils/download";
import LoadState from "../components/LoadState.vue";

const groupIds = ref<string[]>([]);
const groups = useResource((signal) => getImportGroups(signal), [], () => "import-groups");
const downloads = useAction();

async function download() {
  await downloads.run(async () => {
    const blob = await downloadCredentials([...groupIds.value]);
    saveBlob(blob, "vsoko-credentials.xlsx");
  });
}
</script>

<template>
  <PageHeader title="Экспорт">Скачивание данных системы в Excel.</PageHeader>
  <section class="card stack" aria-labelledby="credentials-title">
    <h2 id="credentials-title">Логины и пароли</h2>
    <p class="muted">
      Логин — номер зачётки, временный пароль — Vsoko и номер зачётки.
      У студентов, сменивших пароль, он не показывается в выгрузке.
      Выберите группы или скачайте доступы для всех групп.
    </p>
    <p v-if="downloads.error.value" class="error-text" role="alert">{{ downloads.error.value }}</p>
    <LoadState skeleton="options" :loading="groups.loading.value" :error="groups.error.value" @retry="groups.refresh">
      <MultiSelectPicker v-if="groups.data.value?.length" v-model="groupIds"
        :options="groups.data.value.map(group => ({ id: group.id, label: group.name }))"
        label="Группы для выгрузки" search-label="Поиск групп для выгрузки"
        search-placeholder="Поиск по названию группы" empty-message="Группы не найдены. Попробуйте другое название."
        :disabled="downloads.pending.value" />
      <p v-else class="muted">Пока нет групп для выгрузки. Добавьте студентов через импорт.</p>
      <button class="btn btn--primary" :disabled="downloads.pending.value || !groups.data.value?.length" @click="download">
        {{ downloads.pending.value ? "Скачиваем…" : groupIds.length ? `Скачать (${groupIds.length})` : "Скачать для всех групп" }}
      </button>
    </LoadState>
  </section>
</template>
