import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useLogin } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import './LoginPage.css';

export function LoginPage() {
  const { isAuthenticated, isAdmin } = useAuthStore();
  const { mutate: login, isPending, error } = useLogin();
  const [form, setForm] = useState({ login: '', password: '' });

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/dashboard' : '/workloads'} replace />;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login(form);
  };

  const errorMessage = error
    ? ((error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Ошибка авторизации')
    : '';

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__icon">
            <GraduationCap size={32} />
          </div>
          <h1 className="login-card__title">ВСОКО</h1>
          <p className="login-card__subtitle">Внутренняя Система Оценки Качества Образования</p>
        </div>
        <form className="login-card__form" onSubmit={handleSubmit}>
          <Input
            label="Логин"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
            placeholder="Введите логин"
            required
          />
          <Input
            label="Пароль"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Введите пароль"
            required
          />
          {errorMessage && <div className="login-card__error">{errorMessage}</div>}
          <Button type="submit" loading={isPending} size="lg" className="login-card__btn">
            Войти
          </Button>
        </form>
      </div>
    </div>
  );
}
