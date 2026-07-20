import type { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="relative flex-1 overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse at 50% 55%, #10163A 0%, #0A0E2A 40%, #080B24 70%, #050814 100%)',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
