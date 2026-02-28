import { LogOut, Menu } from 'lucide-react';
import { useLogout } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import './Header.css';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { mutate: logout, isPending } = useLogout();
  const isAdmin = useAuthStore((s) => s.isAdmin);

  return (
    <header className="header">
      <button className="header__menu-btn" onClick={onMenuToggle}>
        <Menu size={22} />
      </button>
      <div className="header__left">
        <h1 className="header__title">ВСОКО</h1>
        <span className="header__role">{isAdmin ? 'Администратор' : 'Студент'}</span>
      </div>
      <button className="header__logout" onClick={() => logout()} disabled={isPending}>
        <LogOut size={18} />
        <span>Выйти</span>
      </button>
    </header>
  );
}
