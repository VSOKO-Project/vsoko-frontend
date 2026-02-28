import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageSquare, Users, BookOpen, TrendingUp } from 'lucide-react';
import { getTeachersRating } from '../../api/teachers';
import { getDisciplinesRating } from '../../api/disciplines';
import { getFeedbacks } from '../../api/feedback';
import { Spinner } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';
import './DashboardPage.css';

export function DashboardPage() {
  const { data: teachersData, isLoading: tLoading } = useQuery({
    queryKey: ['teachers-rating-dash'],
    queryFn: () => getTeachersRating({ Page: 1, PageSize: 10 }),
  });

  const { data: disciplinesData, isLoading: dLoading } = useQuery({
    queryKey: ['disciplines-rating-dash'],
    queryFn: () => getDisciplinesRating({ Page: 1, PageSize: 10 }),
  });

  const { data: feedbackData, isLoading: fLoading } = useQuery({
    queryKey: ['feedback-count-dash'],
    queryFn: () => getFeedbacks({ Page: 1, PageSize: 1 }),
  });

  const isLoading = tLoading || dLoading || fLoading;
  if (isLoading) return <Spinner />;

  const totalFeedbacks = feedbackData?.totalCount || 0;
  const teacherItems = teachersData?.items || [];
  const disciplineItems = disciplinesData?.items || [];

  const avgTeacherGrade = teacherItems.length
    ? (teacherItems.reduce((s, t) => s + t.grade, 0) / teacherItems.length)
    : 0;
  const avgDisciplineGrade = disciplineItems.length
    ? (disciplineItems.reduce((s, d) => s + d.grade, 0) / disciplineItems.length)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Дашборд</h1>
        <p className="page-subtitle">Общая статистика системы</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(66, 165, 245, 0.12)', color: 'var(--color-accent)' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="stat-card__value">{totalFeedbacks}</div>
            <div className="stat-card__label">Всего отзывов</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(76, 175, 80, 0.12)', color: 'var(--color-success)' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-card__value">{teachersData?.totalCount || 0}</div>
            <div className="stat-card__label">Преподавателей</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(156, 39, 176, 0.12)', color: '#9c27b0' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div className="stat-card__value">{disciplinesData?.totalCount || 0}</div>
            <div className="stat-card__label">Дисциплин</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(255, 152, 0, 0.12)', color: 'var(--color-warning)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-card__value">{((avgTeacherGrade + avgDisciplineGrade) / 2).toFixed(1)}</div>
            <div className="stat-card__label">Средний балл</div>
          </div>
        </div>
      </div>

      <div className="dashboard-charts">
        <Card className="dashboard-chart">
          <h3 className="dashboard-chart__title">Рейтинг преподавателей (Топ-10)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teacherItems} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" domain={[0, 5]} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="grade" fill="#1a237e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="dashboard-chart">
          <h3 className="dashboard-chart__title">Рейтинг дисциплин (Топ-10)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={disciplineItems} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" domain={[0, 5]} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="grade" fill="#42a5f5" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
