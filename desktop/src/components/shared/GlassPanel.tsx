import type { ReactNode, CSSProperties } from 'react';

interface GlassPanelProps {
  variant?: 'default' | 'strong' | 'light';
  glow?: 'none' | 'hover' | 'active';
  padding?: boolean;
  className?: string;
  children: ReactNode;
}

const variantClasses: Record<NonNullable<GlassPanelProps['variant']>, string> = {
  default: 'glass-panel',
  strong: 'glass-panel-strong',
  light: 'glass-panel-light',
};

export default function GlassPanel({
  variant = 'default',
  glow = 'none',
  padding = true,
  className,
  children,
}: GlassPanelProps) {
  const baseClass = variantClasses[variant];

  const glowStyle: CSSProperties =
    glow === 'active'
      ? {
          boxShadow: '0 0 30px rgba(99, 91, 255, 0.35)',
          borderColor: 'rgba(150, 150, 255, 0.5)',
        }
      : {};

  const hoverClass =
    glow === 'hover'
      ? 'transition-all duration-300 hover:border-[var(--color-glass-border-hover)] hover:shadow-[0_0_30px_rgba(99,91,255,0.35)]'
      : '';

  const paddingClass = padding ? 'p-5' : '';

  const combined = [baseClass, paddingClass, hoverClass, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combined} style={glowStyle}>
      {children}
    </div>
  );
}
