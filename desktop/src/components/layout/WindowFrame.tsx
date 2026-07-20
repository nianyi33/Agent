import { type ReactNode } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface WindowFrameProps {
  children: ReactNode;
}

function WindowFrame({ children }: WindowFrameProps) {
  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div className="flex h-full w-full flex-col rounded-2xl overflow-hidden bg-[#080B24]">
      {/* Title bar — draggable, Windows-style controls on right */}
      <div
        data-tauri-drag-region
        className="flex h-[38px] flex-shrink-0 items-center justify-end px-4"
      >
        <div className="flex items-center gap-1" data-tauri-drag-region>
          <button
            type="button"
            onClick={handleMinimize}
            className="flex h-8 w-12 items-center justify-center rounded-[6px] text-[#8888BB] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F0F0FF] transition-colors"
            title="最小化"
          >
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="5.5" width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button
            type="button"
            onClick={handleMaximize}
            className="flex h-8 w-12 items-center justify-center rounded-[6px] text-[#8888BB] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F0F0FF] transition-colors"
            title="最大化"
          >
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-12 items-center justify-center rounded-[6px] text-[#8888BB] hover:bg-[#E81123] hover:text-white transition-colors"
            title="关闭"
          >
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default WindowFrame;
