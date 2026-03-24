'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Users, Globe, LogOut, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/admin',           label: 'Overview',   icon: LayoutDashboard },
  { href: '/admin/modules',   label: 'Modules',    icon: BookOpen },
  { href: '/admin/users',     label: 'Users',      icon: Users },
  { href: '/admin/languages', label: 'Languages',  icon: Globe },
]

export function AdminSidebar({ displayName }: { displayName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-slate-200 flex-col z-30">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-slate-100">
          <div className="size-7 rounded-lg bg-[#ff8052] flex items-center justify-center">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">Fluent</p>
            <p className="text-[10px] text-slate-400 font-medium">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
            return (
              <Link key={href} href={href}>
                <div className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}>
                  <Icon size={16} />
                  {label}
                  {isActive && <ChevronRight size={14} className="ml-auto text-orange-400" />}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-100 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="size-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <span className="text-orange-600 font-bold text-xs">{displayName[0]?.toUpperCase()}</span>
            </div>
            <p className="text-xs text-slate-600 font-medium truncate">{displayName}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
          <Link href="/dashboard">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
              ← Back to app
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-[#ff8052] flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">F</span>
          </div>
          <span className="text-sm font-bold text-slate-900">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
            return (
              <Link key={href} href={href}>
                <div className={cn(
                  'p-1.5 rounded-md transition-colors',
                  isActive ? 'bg-orange-100 text-orange-600' : 'text-slate-500'
                )}>
                  <Icon size={16} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
