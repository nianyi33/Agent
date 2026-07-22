import {
  LayoutGrid,
  LayoutDashboard,
  Bot,
  Brain,
  Wrench,
  Cog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import type { AppRoute } from '../../types';

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: AppRoute;
}

const sidebarItems: SidebarItem[] = [
  { id: 'home', label: '首页', icon: LayoutGrid, route: 'home' },
  { id: 'workspace', label: '工作区', icon: LayoutDashboard, route: 'workspace' },
  { id: 'agent-studio', label: '智能体', icon: Bot, route: 'agent-studio' },
  { id: 'memory-universe', label: '记忆宇宙', icon: Brain, route: 'memory-universe' },
  { id: 'tools', label: '工具', icon: Wrench, route: 'tools' },
  { id: 'settings', label: '设置', icon: Cog, route: 'settings' },
];

function Sidebar() {
  const activeRoute = useAppStore((s) => s.activeRoute);
  const setActiveRoute = useAppStore((s) => s.setActiveRoute);

  return (
    <nav
      className="flex w-[260px] flex-shrink-0 flex-col items-center gap-[2px] border-r"
      style={{
        borderRightColor: 'rgba(150,150,255,0.25)',
        padding: '16px 12px',
      }}
    >
      {sidebarItems.map((item) => {
        const isActive = activeRoute === item.route;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveRoute(item.route)}
            className="group relative flex items-center justify-center gap-3 h-[52px] rounded-[16px] px-4 text-[13px] font-medium tracking-[0.02em] transition-all duration-200 cursor-pointer border-none w-full"
            style={{
              color: isActive ? '#F0F0FF' : '#8888BB',
              ...(isActive
                ? {
                    background: 'linear-gradient(90deg, #635BFF, #8B5CFF)',
                    boxShadow: '0 0 30px rgba(99,91,255,0.5)',
                  }
                : { background: 'transparent' }),
            }}
          >
            {/* Hover overlay for non-active items — visible only on group hover */}
            {!isActive && (
              <span
                className="absolute inset-0 rounded-[16px] opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(99,91,255,0.12), rgba(139,92,255,0.12))',
                }}
              />
            )}
            <Icon className="h-[18px] w-[18px] flex-shrink-0" />
            <span>{item.label}</span>
          </button>
        );
      })}

      {/* Bottom area with logo and glass shelf */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: '16px',
        }}
      >
        <img
          src="/sidebar-logo.png"
          alt="闪电树懒 Logo"
          style={{
            width: 'calc(100% - 10px)',
            aspectRatio: '1',
            objectFit: 'contain',
            opacity: 0.9,
            cursor: 'pointer',
            marginBottom: '6px',
            position: 'relative',
            zIndex: 2,
            filter: 'drop-shadow(0 0 12px rgba(99,91,255,0.3))',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLImageElement).style.opacity = '1';
            (e.target as HTMLImageElement).style.filter =
              'drop-shadow(0 0 20px rgba(99,91,255,0.6))';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLImageElement).style.opacity = '0.9';
            (e.target as HTMLImageElement).style.filter =
              'drop-shadow(0 0 12px rgba(99,91,255,0.3))';
          }}
        />

        {/* Glass shelf */}
        <div
          className="flex-shrink-0 relative"
          style={{
            width: 'calc(100% - 50px)',
            height: '6px',
            transform: 'translateY(-60px)',
            borderRadius: '40px',
            background:
              'linear-gradient(180deg, rgba(139,92,255,0.4) 0%, rgba(99,91,255,0.15) 50%, rgba(74,156,255,0.25) 100%)',
            boxShadow:
              '0 0 16px rgba(99,91,255,0.35), 0 0 40px rgba(139,92,255,0.15), 0 8px 20px rgba(0,0,0,0.4)',
          }}
        >
          {/* Glow reflection above */}
          <span
            className="absolute left-[10%] w-[80%]"
            style={{
              top: '-10px',
              height: '6px',
              background:
                'radial-gradient(ellipse at center, rgba(139,92,255,0.6), rgba(99,91,255,0.2), transparent 80%)',
              filter: 'blur(3px)',
            }}
          />
          {/* Reflection below */}
          <span
            className="absolute left-[15%] w-[70%]"
            style={{
              bottom: '-8px',
              height: '4px',
              background:
                'radial-gradient(ellipse at center, rgba(74,156,255,0.4), rgba(99,91,255,0.15), transparent 80%)',
              filter: 'blur(2px)',
            }}
          />
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;
