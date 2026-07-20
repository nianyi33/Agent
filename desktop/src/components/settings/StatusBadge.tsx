interface StatusBadgeProps {
  status: 'online' | 'offline' | 'error' | 'loading';
  label: string;
}

const colorMap: Record<StatusBadgeProps['status'], string> = {
  online: '#00E676',
  offline: '#555588',
  error: '#FF5252',
  loading: '#4A9CFF',
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: colorMap[status],
          flexShrink: 0,
          ...(status === 'loading'
            ? { animation: 'glow-pulse 1.5s ease-in-out infinite' }
            : status === 'online'
              ? { boxShadow: `0 0 6px ${colorMap[status]}` }
              : {}),
        }}
      />
      {label}
    </span>
  );
}
