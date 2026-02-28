import type { CSSProperties, ReactNode } from 'react';
import './Card.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  style?: CSSProperties;
}

export function Card({ children, className = '', gradient, style }: CardProps) {
  return (
    <div className={`card ${gradient ? 'card--gradient' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}
