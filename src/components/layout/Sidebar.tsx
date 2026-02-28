import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Star, BookOpen, MessageSquare, Users,
  GraduationCap, ListChecks, Brain, FileText, ClipboardList,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './Sidebar.css';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const studentLinks = [
  { to: '/workloads', icon: ClipboardList, label: 'Нагрузки' },
  { to: '/my-feedback', icon: MessageSquare, label: 'Мои отзывы' },
];

const adminLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/teachers/rating', icon: Star, label: 'Рейтинг преподавателей' },
  { to: '/disciplines/rating', icon: BookOpen, label: 'Рейтинг дисциплин' },
  { to: '/feedback', icon: MessageSquare, label: 'Отзывы' },
  { to: '/teachers', icon: Users, label: 'Преподаватели' },
  { to: '/disciplines', icon: GraduationCap, label: 'Дисциплины' },
  { to: '/criteria', icon: ListChecks, label: 'Критерии' },
  { to: '/summaries', icon: Brain, label: 'Сводки (AI)' },
  { to: '/reports', icon: FileText, label: 'Отчёты' },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">В</div>
          <span className="sidebar__logo-text">ВСОКО</span>
        </div>
        <nav className="sidebar__nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
              onClick={onClose}
            >
              <link.icon size={20} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
