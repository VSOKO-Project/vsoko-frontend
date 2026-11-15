<script setup lang="ts">
import type { ImportReportDto } from "../types";
defineProps<{ report: ImportReportDto; applied?: boolean }>();
const labels = { groups: "Группы", students: "Студенты", teachers: "Преподаватели", disciplines: "Дисциплины", workloads: "Нагрузка" };
</script>

<template>
  <div class="import-summary">
    <div v-for="(counts, key) in report.summary" :key="key" class="import-summary__card">
      <span>{{ labels[key] }}</span>
      <div><strong>{{ counts.create }}</strong> {{ applied ? "добавлено" : "добавить" }}
        · {{ counts.update }} {{ applied ? "обновлено" : "обновить" }}
        · {{ counts.existing }} без изменений
        <span v-if="counts.delete"> · {{ counts.delete }} {{ applied ? "удалено" : "удалить" }}</span>
      </div>
    </div>
  </div>
  <div v-if="report.changes.length" class="table-wrapper">
    <table>
      <caption>{{ applied ? "Применённые изменения" : "Изменения: было → станет" }}</caption>
      <thead><tr><th>Запись</th><th>Поле</th><th>Было</th><th>{{ applied ? "Стало" : "Станет" }}</th></tr></thead>
      <tbody><tr v-for="(change, i) in report.changes" :key="i">
        <td>{{ change.entity }} · {{ change.key }}</td><td>{{ change.field }}</td><td>{{ change.before }}</td><td>{{ change.after }}</td>
      </tr></tbody>
    </table>
  </div>
  <p v-if="!applied && report.changes.some(c => c.entity !== 'Студент')" class="muted">
    Переименования преподавателей и дисциплин применятся во всех семестрах. Связи и отзывы сохранятся.
  </p>
  <details v-if="report.newTeachers.length || report.newDisciplines.length">
    <summary>{{ applied ? "Добавленные записи справочников" : "Новые записи справочников — проверьте названия" }}</summary>
    <p v-if="!applied" class="muted">Если вы исправляете существующую запись, используйте выгрузку с сохранёнными ID и режим обновления.</p>
    <ul><li v-for="name in report.newTeachers" :key="`t:${name}`">Преподаватель: {{ name }}</li>
      <li v-for="name in report.newDisciplines" :key="`d:${name}`">Дисциплина: {{ name }}</li></ul>
  </details>
  <div v-if="!applied && report.workloadsToDelete.length" class="table-wrapper">
    <table>
      <caption>Будет удалено из нагрузки: {{ report.workloadsToDelete.length }}</caption>
      <thead><tr><th>Преподаватель</th><th>Дисциплина</th><th>Группа</th></tr></thead>
      <tbody><tr v-for="(w, i) in report.workloadsToDelete" :key="i"><td>{{ w.teacher }}</td><td>{{ w.discipline }}</td><td>{{ w.group }}</td></tr></tbody>
    </table>
  </div>
  <div v-for="kind in ['errors', 'warnings'] as const" :key="kind">
    <div v-if="report[kind].length" class="table-wrapper">
      <table>
        <caption>{{ kind === 'errors' ? 'Ошибки' : 'Предупреждения' }}: {{ report[kind].length }}</caption>
        <thead><tr><th>Лист</th><th>Строка</th><th>Сообщение</th></tr></thead>
        <tbody><tr v-for="(issue, i) in report[kind]" :key="i"><td>{{ issue.sheet || 'Файл' }}</td><td>{{ issue.row || '—' }}</td><td>{{ issue.message }}</td></tr></tbody>
      </table>
    </div>
  </div>
</template>
