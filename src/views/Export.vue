<script setup lang="ts">
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
      <fieldset v-if="groups.data.value?.length" class="import-fieldset" :disabled="downloads.pending.value">
        <legend class="muted">Группы для выгрузки</legend>
        <div class="group-picker">
          <label v-for="group in groups.data.value" :key="group.id">
            <input v-model="groupIds" type="checkbox" :value="group.id" />{{ group.name }}
          </label>
        </div>
      </fieldset>
      <p v-else class="muted">Пока нет групп для выгрузки. Добавьте студентов через импорт.</p>
      <button class="btn btn--primary" :disabled="downloads.pending.value || !groups.data.value?.length" @click="download">
        {{ downloads.pending.value ? "Скачиваем…" : groupIds.length ? `Скачать (${groupIds.length})` : "Скачать для всех групп" }}
      </button>
    </LoadState>
  </section>
</template>
