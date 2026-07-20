import type { ButtonHTMLAttributes, CSSProperties } from 'react';

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<GlowButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base',
};

export default function GlowButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  style,
  ...rest
}: GlowButtonProps) {
  const sizeClass = sizeClasses[size];

  if (variant === 'primary') {
    const primaryStyle: CSSProperties = {
      background: 'linear-gradient(135deg, #635BFF, #8B5CFF)',
      color: '#F0F0FF',
      borderRadius: '12px',
      fontWeight: 500,
      border: 'none',
      ...style,
    };

    const combined = [
      sizeClass,
      'font-medium transition-all duration-300',
      'hover:shadow-[0_0_30px_rgba(99,91,255,0.5)]',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button className={combined} style={primaryStyle} {...rest}>
        {children}
      </button>
    );
  }

  // ghost variant
  const ghostStyle: CSSProperties = {
    background: 'transparent',
    border: '1px solid rgba(150, 150, 255, 0.15)',
    borderRadius: '12px',
    color: 'var(--color-text-secondary)',
    fontWeight: 500,
    ...style,
  };

  const combined = [
    sizeClass,
    'font-medium transition-all duration-300',
    'hover:text-[var(--color-text-primary)] hover:bg-[rgba(255,255,255,0.05)]',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={combined} style={ghostStyle} {...rest}>
      {children}
    </button>
  );
}
