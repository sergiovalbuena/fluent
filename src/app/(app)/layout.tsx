import { BottomNav } from '@/components/layout/bottom-nav'
import { SidebarNav } from '@/components/layout/sidebar-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">
      <SidebarNav />
      {/* Offset for sidebar on md+, bottom padding on mobile */}
      <div className="md:ml-[60px] pb-24 md:pb-0 min-h-screen">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
