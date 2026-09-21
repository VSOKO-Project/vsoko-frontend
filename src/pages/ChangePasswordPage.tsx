import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { useChangePassword } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import './LoginPage.css';

export function ChangePasswordPage() {
  const { mutate: changePassword, isPending, error } = useChangePassword();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [mismatch, setMismatch] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setMismatch(true);
      return;
    }

    setMismatch(false);
    changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  const errorMessage = mismatch
    ? 'Пароли не совпадают'
    : error
      ? ((error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Не удалось сменить пароль')
      : '';

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__icon">
            <KeyRound size={32} />
          </div>
          <h1 className="login-card__title">Смена пароля</h1>
          <p className="login-card__subtitle">
            Это ваш первый вход — придумайте новый пароль, который будете знать только вы
          </p>
        </div>
        <form className="login-card__form" onSubmit={handleSubmit}>
          <Input
            label="Текущий (временный) пароль"
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            placeholder="Выдан вам ранее"
            required
          />
          <Input
            label="Новый пароль"
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            placeholder="Не менее 6 символов"
            minLength={6}
            required
          />
          <Input
            label="Повторите новый пароль"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Ещё раз новый пароль"
            minLength={6}
            required
          />
          {errorMessage && <div className="login-card__error">{errorMessage}</div>}
          <Button type="submit" loading={isPending} size="lg" className="login-card__btn">
            Сменить пароль
          </Button>
        </form>
      </div>
    </div>
  );
}
