'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { deleteAccount } from '@/app/(app)/actions'
import { trackEvent } from '@/lib/analytics'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

/** Deletes the account for good, after typing the confirmation word */
export function DeleteAccountButton() {
  const t = useTranslations('profile')
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [isPending, startTransition] = useTransition()

  const word = t('delete_account_word')
  const confirmed = typed.trim().toLowerCase() === word.toLowerCase()

  function handleDelete() {
    if (!confirmed || isPending) return
    startTransition(async () => {
      const result = await deleteAccount()
      if (!result.ok) {
        toast.error(t('delete_account_error'))
        return
      }
      trackEvent('account_deleted', {})
      // Drafts and settings kept on this device belong to the deleted account
      try {
        Object.keys(localStorage).filter(k => k.startsWith('fluent:')).forEach(k => localStorage.removeItem(k))
      } catch {
        // storage blocked: nothing to clear
      }
      // Full reload: no cached pages of the deleted account
      window.location.assign('/')
    })
  }

  return (
    <>
      <button
        onClick={() => { setTyped(''); setOpen(true) }}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 size={14} />
        {t('delete_account')}
      </button>

      <Dialog open={open} onOpenChange={next => { if (!isPending) setOpen(next) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete_account_title')}</DialogTitle>
            <DialogDescription>{t('delete_account_desc')}</DialogDescription>
          </DialogHeader>
          <label className="block space-y-2 text-sm">
            <span className="text-muted-foreground">{t('delete_account_type', { word })}</span>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full rounded-xl border border-primary/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-red-400"
            />
          </label>
          <DialogFooter>
            <button
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-primary/10 disabled:opacity-50"
            >
              {t('delete_account_cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={!confirmed || isPending}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
            >
              {isPending ? t('delete_account_deleting') : t('delete_account_confirm')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
