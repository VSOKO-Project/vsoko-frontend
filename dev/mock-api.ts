import type { Plugin } from 'vite';
import { randomUUID } from 'node:crypto';
import { criteria, period, teacher, discipline, group, responseData, session } from '../tests/fixtures';

/** In-memory API for local UI review; never included in a production build. */
export function mockApi(): Plugin {
  const teachers = [teacher, { ...teacher, id: 't2', surname: 'Смирнов', name: 'Алексей', patronymic: 'Сергеевич', fullName: 'Смирнов Алексей Сергеевич' }];
  const disciplines = [discipline, { id: 'd2', name: 'Программирование' }, { id: 'd3', name: 'Линейная алгебра' }];
  const workloads = disciplines.map((discipline, i) => ({ id: `w${i + 1}`, teacher: teachers[i % teachers.length], discipline, group, period }));
  const feedbacks = workloads.slice(0, 2).map((workload, i) => ({
    id: `f${i + 1}`, comment: ['Понятные лекции и полезные примеры. Хотелось бы больше практики.', 'Материалы доступны, но темп занятий иногда слишком быстрый.'][i],
    createdAtUtc: `2026-11-${10 + i}T12:00:00Z`, workload, student: { id: 'student', group },
    criteriaFeedback: criteria.map(criteria => ({ criteria, criteriaScore: 4 - i })),
  }));
  function rating(item: any, teacher = false) {
    const rows = feedbacks.filter(f => (teacher ? f.workload.teacher.id : f.workload.discipline.id) === item.id);
    const object = teacher ? 'Teacher' : 'Discipline';
    const scores = rows.flatMap(f => f.criteriaFeedback).filter(c => c.criteria?.object === object).map(c => c.criteriaScore);
    return { id: item.id, name: item.fullName || item.name, grade: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0, feedbackCount: rows.filter(f => f.criteriaFeedback.some(c => c.criteria?.object === object)).length };
  }
  function paged(items: any[], url: URL) {
    const query = url.searchParams.get('Query')?.toLocaleLowerCase();
    if (query) items = items.filter(item => JSON.stringify(item).toLocaleLowerCase().includes(query));
    for (const [key, value] of url.searchParams) {
      const field = { TeacherId: 'teacher', DisciplineId: 'discipline', WorkloadId: 'id', PeriodId: 'period' }[key];
      if (field) items = items.filter(item => {
        const target = item.workload || item;
        return (target[field]?.id ?? target[field]) === value;
      });
    }
    const page = Math.max(1, Number(url.searchParams.get('Page')) || 1);
    const pageSize = Math.max(1, Number(url.searchParams.get('PageSize')) || 10);
    return { items: items.slice((page - 1) * pageSize, page * pageSize), totalCount: items.length, totalPages: Math.ceil(items.length / pageSize), page, pageSize };
  }
  return {
    name: 'local-mock-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const url = new URL(req.url || '/', 'http://localhost');
        const path = url.pathname;
        const method = req.method || 'GET';
        const send = (data: unknown, status = 200) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ data }));
        };
        try {
          let raw = '';
          for await (const chunk of req) raw += chunk;
          const body = req.headers['content-type']?.includes('application/json') && raw ? JSON.parse(raw) : {};
          if (path.startsWith('/Security/')) {
            if (path === '/Security/LogOut') { res.statusCode = 204; res.end(); return; }
            const login = body.login || (body.refresh === 'mock-admin' ? 'admin' : 'student');
            send({ ...session, login, userId: login, isAdmin: login === 'admin', refreshToken: `mock-${login}`, expires: '2099-01-01T00:00:00Z' }); return;
          }
          if (path === '/Dashboard') {
            const ratings = disciplines.map(d => rating(d));
            const rated = ratings.filter(r => r.grade > 0);
            const mean = rated.length ? rated.reduce((sum, r) => sum + r.grade, 0) / rated.length : null;
            send({ ratedFeedbackCount: feedbacks.length,
              comparison: mean === null ? null : { currentTitle: '2026/27, осенний семестр', previousTitle: '2025/26, весенний семестр', delta: Math.round((mean - 3.9) * 100) / 100, currentFeedbackCount: feedbacks.length, previousFeedbackCount: 52 },
              coverage: { submittedCount: feedbacks.length, possibleCount: workloads.length * 24, completionPercent: Math.round(feedbacks.length / (workloads.length * 24) * 1000) / 10 }, feedbackCount: feedbacks.length, teacherCount: teachers.length, disciplineCount: disciplines.length,
              averageGrade: mean, lowGradeCount: rated.filter(r => r.grade < 3.5).length,
              lowGrades: rated.filter(r => r.grade < 3.5), highGrades: ratings.filter(r => r.grade >= 4),
              distribution: ['1–2', '2–3', '3–4', '4–5'].map((label, i) => ({ label, value: ratings.filter(r => Math.min(3, Math.floor(r.grade) - 1) === i).length })),
              timeline: [
                { periodId: 'p-2', title: '2025/26, осенний семестр', feedbackCount: 45, averageGrade: 3.5, disciplineCount: 3, coverage: { submittedCount: 45, possibleCount: 72, completionPercent: 62.5 } },
                { periodId: 'p-1', title: '2025/26, весенний семестр', feedbackCount: 52, averageGrade: 3.9, disciplineCount: 3, coverage: { submittedCount: 52, possibleCount: 72, completionPercent: 72.2 } },
                { periodId: period.id, title: '2026/27, осенний семестр', feedbackCount: feedbacks.length, averageGrade: mean, disciplineCount: rated.length, coverage: { submittedCount: feedbacks.length, possibleCount: workloads.length * 24, completionPercent: Math.round(feedbacks.length / (workloads.length * 24) * 1000) / 10 } },
              ],
            }); return;
          }
          if (path === '/Periods') { send([{ ...period, workloadCount: workloads.length, feedbackCount: feedbacks.length }]); return; }
          if (/^\/Periods\/[^/]+\/feedback$/.test(path)) { period.isFeedbackOpen = body.isOpen; send(period); return; }
          if (path === '/Workload') { send(paged(workloads, url)); return; }
          if (path.startsWith('/Workload/')) { send(workloads.find(w => w.id === path.split('/')[2])); return; }
          if (path.startsWith('/Feedback')) {
            const id = path.split('/')[2];
            const index = feedbacks.findIndex(f => f.id === id);
            if (method === 'DELETE') { if (index >= 0) feedbacks.splice(index, 1); res.statusCode = 204; res.end(); return; }
            if (method === 'POST' || method === 'PUT') {
              const workload = workloads.find(w => w.id === body.workloadId) || feedbacks[index]?.workload;
              if (!workload) { send(null, 400); return; }
              const entry = { id: id || randomUUID(), workload, student: { id: 'student', group }, comment: body.comment, createdAtUtc: feedbacks[index]?.createdAtUtc || new Date().toISOString(), criteriaFeedback: (body.feedback || []).map((f: any) => ({ criteria: criteria.find(c => c.id === f.criteriaId), criteriaScore: f.grade })) };
              if (index >= 0) feedbacks[index] = entry; else feedbacks.push(entry);
              send(entry.id); return;
            }
            send(id ? feedbacks[index] : paged(feedbacks, url)); return;
          }
          for (const [resource, items] of [['Teachers', teachers], ['Disciplines', disciplines], ['Criteria', criteria]] as const) {
            if (!path.startsWith(`/${resource}`)) continue;
            const [, , id, action] = path.split('/');
            if (id === 'rating') { send(paged(items.map(item => rating(item, resource === 'Teachers')), url)); return; }
            const list = items as any[];
            const index = list.findIndex(item => item.id === id);
            if (method === 'DELETE') { if (index >= 0) list.splice(index, 1); res.statusCode = 204; res.end(); return; }
            if (action === 'merge') {
              const target = list.find(item => item.id === body.targetId);
              if (!target) { send(null, 404); return; }
              for (const workload of workloads) {
                if (resource === 'Teachers' && workload.teacher.id === id) workload.teacher = target;
                if (resource === 'Disciplines' && workload.discipline.id === id) workload.discipline = target;
              }
              if (index >= 0) list.splice(index, 1);
              send(target); return;
            }
            if (method === 'PUT' || method === 'POST') {
              const entry = { ...body, id: id || randomUUID(), ...(resource === 'Criteria' ? { object: body.criteriaObject } : {}), ...(resource === 'Teachers' ? { fullName: [body.surname, body.name, body.patronymic].join(' ') } : {}) };
              if (index >= 0) Object.assign(list[index], entry); else list.push(entry);
              send(index >= 0 ? list[index] : entry); return;
            }
            send(id ? list[index] : resource === 'Criteria' ? list : paged(list, url)); return;
          }
          const fallback = responseData(path);
          if (fallback !== null) { send(fallback); return; }
          res.statusCode = 501;
          res.end(JSON.stringify({ detail: `Мок для ${method} ${path} пока не реализован` }));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ detail: String(error) }));
        }
      });
    },
  };
}
