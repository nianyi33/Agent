import { Bell, Settings } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';

/* ── Notification data ── */
interface Notification {
  id: string;
  title: string;
  body: string;
  link?: string;
  ts: number;
  read: boolean;
}

const DEV_NOTIFICATIONS: Notification[] = [
  {
    id: 'promo-xinyun',
    title: '芯云平台限时活动',
    body: '新用户首充立享额外赠送 · 限时 7 天\n\n四档福利，多充多送：\n· 体验档 充 49 元 → 到账 55 元(89折)\n· 标准档 充 99 元 → 到账 115 元(86折)🔥\n· 进阶档 充 299 元 → 到账 355 元(85折)\n· 旗舰档 充 999 元 → 到账 1200 元(83折)，享优先调用权\n\n✨ 新用户首充额外再送 10 元\n👥 邀请好友充值，双方各得 10 元\n⏰ 仅限 7 天，活动结束恢复原价',
    link: 'https://xinyuntoken.com/',
    ts: Date.now(),
    read: false,
  },
];

function Header() {
  const setActiveRoute = useAppStore((s) => s.setActiveRoute);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(DEV_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unread = notifs.filter(n => !n.read).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <header
      className="flex h-[72px] flex-shrink-0 items-center justify-between mx-4 border-b"
      style={{ borderBottomColor: 'rgba(150,150,255,0.25)' }}
    >
      {/* Left: logo + title */}
      <div className="flex items-center gap-3">
        <img
          src="/app0.png"
          alt="闪电树懒"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            objectFit: 'cover',
            position: 'relative',
            left: '16px',
          }}
        />
        <div className="flex flex-col leading-none" style={{ marginLeft: '16px' }}>
          <span className="text-[14px] font-semibold tracking-wide" style={{ color: '#F0F0FF' }}>
            闪电树懒
          </span>
          <span className="text-[10px] tracking-[0.08em]" style={{ color: '#555588' }}>
            v0.1.0
          </span>
        </div>
      </div>

      {/* Right: notification bell + settings */}
      <div className="flex items-center gap-2">
        {/* Notification button + dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="relative flex h-9 w-9 items-center justify-center rounded-[12px] transition-all hover:text-[var(--color-text-primary)] hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: '#8888BB' }}
            title="通知"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 7, height: 7, borderRadius: '50%',
                background: '#FF5F57',
                boxShadow: '0 0 6px #FF5F57',
              }} />
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 340, maxHeight: 420, overflowY: 'auto',
              background: 'rgba(10,15,45,0.95)', backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(150,150,255,0.25)',
              borderRadius: 20, padding: 8,
              boxShadow: '0 0 40px rgba(99,91,255,0.2), 0 10px 30px rgba(0,0,0,0.5)',
              zIndex: 50,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: '#8888BB',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '8px 12px 6px',
              }}>
                通知 {unread > 0 && <span style={{ color: '#FF5F57' }}>({unread})</span>}
              </div>
              {notifs.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: '#555588' }}>
                  暂无通知
                </div>
              ) : (
                notifs.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                      if (n.link) window.open(n.link, '_blank');
                    }}
                    style={{
                      padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                      transition: 'background 0.15s',
                      background: n.read ? 'transparent' : 'rgba(99,91,255,0.06)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(99,91,255,0.06)'; }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#F0F0FF', marginBottom: 6 }}>
                      {!n.read && <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#8B5CFF', marginRight:6 }} />}
                      {n.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#A0A0CC', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {n.body}
                    </div>
                    {n.link && (
                      <div style={{ fontSize: 10, color: '#8B5CFF', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>🔗</span> {n.link}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setActiveRoute('settings')}
          className="flex h-9 w-9 items-center justify-center rounded-[12px] text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text-primary)] hover:bg-[rgba(255,255,255,0.06)]"
          style={{ color: '#8888BB' }}
          title="设置"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

export default Header;
