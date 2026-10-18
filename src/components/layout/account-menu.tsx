'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Menu } from '@base-ui/react/menu'
import { motion } from 'framer-motion'
import { BarChart2, ChevronsUpDown, Gem, LogOut, User } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export type Account = {
  name: string
  email: string | null
  avatarUrl: string | null
  gems: number
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?'
}

function AccountAvatar({ account, className }: { account: Account; className?: string }) {
  return account.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- Google avatar, no next/image domain config needed
    <img src={account.avatarUrl} alt="" referrerPolicy="no-referrer" className={cn('rounded-full object-cover', className)} />
  ) : (
    <span className={cn('rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center', className)}>
      {initials(account.name)}
    </span>
  )
}

const itemClass =
  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer select-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary'

/** Sidebar footer: the profile row opens a menu (profile, progress, gems, sign out) */
export function AccountMenu({ account, active }: { account: Account; active: boolean }) {
  const t = useTranslations('nav')
  const tp = useTranslations('profile')
  const router = useRouter()
  const { open: sidebarOpen, animate, hold } = useSidebar()

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Menu.Root onOpenChange={hold}>
      <Menu.Trigger
        aria-label={t('profile')}
        className={cn(
          'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-all outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary/40',
          active
            ? 'bg-primary text-white shadow-md shadow-primary/20'
            : 'text-slate-600 dark:text-slate-300 hover:bg-primary/10 data-[popup-open]:bg-primary/10',
        )}
      >
        <AccountAvatar account={account} className={cn('size-7 shrink-0 text-[11px]', active && 'ring-2 ring-white/60')} />
        <motion.span
          animate={{
            opacity: animate ? (sidebarOpen ? 1 : 0) : 1,
            width: animate ? (sidebarOpen ? 'auto' : 0) : 'auto',
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap"
        >
          <span className="min-w-0 flex-1 truncate">{account.name}</span>
          <ChevronsUpDown size={14} className="shrink-0 opacity-50" />
        </motion.span>
      </Menu.Trigger>

      <Menu.Portal>
        {/* Above the mobile drawer (z-100) */}
        <Menu.Positioner side="top" align="start" sideOffset={8} className="z-[120] outline-none">
          <Menu.Popup
            className={cn(
              'w-60 origin-[var(--transform-origin)] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#202638] p-1.5 shadow-xl shadow-black/10 outline-none',
              'transition-[opacity,transform] duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            )}
          >
            <div className="flex items-center gap-2.5 px-2.5 pb-2.5 pt-2">
              <AccountAvatar account={account} className="size-9 shrink-0 text-xs" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{account.name}</p>
                {account.email && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{account.email}</p>}
              </div>
            </div>
            <div className="mx-1 mb-1 h-px bg-black/[0.06] dark:bg-white/[0.08]" />

            <Menu.LinkItem render={<Link href="/profile" />} className={itemClass}>
              <User size={16} className="shrink-0 opacity-70" /> {t('profile')}
            </Menu.LinkItem>
            <Menu.LinkItem render={<Link href="/progress" />} className={itemClass}>
              <BarChart2 size={16} className="shrink-0 opacity-70" /> {t('progress')}
            </Menu.LinkItem>
            <Menu.LinkItem render={<Link href="/gems" />} className={itemClass}>
              <Gem size={16} className="shrink-0 opacity-70" />
              <span className="flex-1">{t('gems')}</span>
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-bold tabular-nums text-sky-600 dark:text-sky-400">
                {account.gems.toLocaleString()}
              </span>
            </Menu.LinkItem>

            <div className="mx-1 my-1 h-px bg-black/[0.06] dark:bg-white/[0.08]" />
            <Menu.Item
              onClick={signOut}
              className={cn(itemClass, 'text-red-600 dark:text-red-400 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-600')}
            >
              <LogOut size={16} className="shrink-0" /> {tp('sign_out')}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
