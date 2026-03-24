import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { BookOpen, Plus, ExternalLink } from 'lucide-react'

const LANG_META: Record<string, { name: string; flag: string }> = {
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
  pt: { name: 'Portuguese', flag: '🇧🇷' },
  de: { name: 'German', flag: '🇩🇪' },
  it: { name: 'Italian', flag: '🇮🇹' },
  ja: { name: 'Japanese', flag: '🇯🇵' },
}

const SUPPORTED_LANGUAGES = Object.entries(LANG_META).map(([code, meta]) => ({ code, ...meta }))

type ModuleRow = {
  id: string
  title: string
  icon: string
  slug: string
  language_code: string
  order_index: number
  is_published: boolean
  lessons: { count: number }[]
}

async function toggleModule(id: string, current: boolean) {
  'use server'
  const supabase = createAdminClient()
  await supabase.from('modules').update({ is_published: !current }).eq('id', id)
  revalidatePath('/admin/modules')
}

async function createModule(formData: FormData) {
  'use server'
  const title = (formData.get('title') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()
  const icon = (formData.get('icon') as string)?.trim() || '📚'
  const language_code = formData.get('language_code') as string
  const description = (formData.get('description') as string)?.trim() || null

  if (!title || !slug || !language_code) return

  const supabase = createAdminClient()

  // Get next order_index for this language
  const { data: existing } = await supabase
    .from('modules')
    .select('order_index')
    .eq('language_code', language_code)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1

  await supabase.from('modules').insert({
    title,
    slug,
    icon,
    language_code,
    description,
    order_index: nextOrder,
    is_published: false,
  })

  revalidatePath('/admin/modules')
}

export default async function ModulesPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('modules')
    .select('id, title, icon, slug, language_code, order_index, is_published, lessons(count)')
    .order('language_code')
    .order('order_index')

  const modules = (data ?? []) as ModuleRow[]

  // Group by language
  const grouped = modules.reduce<Record<string, ModuleRow[]>>((acc, m) => {
    if (!acc[m.language_code]) acc[m.language_code] = []
    acc[m.language_code].push(m)
    return acc
  }, {})

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Modules</h1>
          <p className="text-sm text-slate-500 mt-0.5">{modules.length} modules across {Object.keys(grouped).length} languages</p>
        </div>
      </div>

      {/* ── New Module Form ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Plus size={15} className="text-orange-500" /> New Module
        </h2>
        <form action={createModule}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Language */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Language *</label>
              <select
                name="language_code"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-orange-400"
              >
                <option value="">— Select language —</option>
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                ))}
              </select>
            </div>

            {/* Icon */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Icon emoji</label>
              <input
                name="icon"
                placeholder="📚"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-orange-400"
              />
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Title *</label>
              <input
                name="title"
                required
                placeholder="e.g. Greetings & Introductions"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-orange-400"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Slug *</label>
              <input
                name="slug"
                required
                placeholder="e.g. greetings-introductions"
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers and hyphens only"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 focus:outline-none focus:border-orange-400"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Description</label>
              <input
                name="description"
                placeholder="Short description (optional)"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">Module will be created as Draft — publish it after adding lessons.</p>
            <button
              type="submit"
              className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              Create Module
            </button>
          </div>
        </form>
      </div>

      {/* ── Module list ── */}
      {Object.entries(grouped).map(([lang, mods]) => {
        const meta = LANG_META[lang] ?? { name: lang.toUpperCase(), flag: '🌐' }
        return (
          <div key={lang} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-lg">{meta.flag}</span>
              <h2 className="text-sm font-bold text-slate-700">{meta.name}</h2>
              <span className="text-xs text-slate-400 ml-auto">{mods.length} modules</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Module</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Slug</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Order</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Lessons</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Published</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mods.map(mod => {
                  const lessonCount = mod.lessons?.[0]?.count ?? 0
                  return (
                    <tr key={mod.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{mod.icon}</span>
                          <span className="font-medium text-slate-800">{mod.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <code className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{mod.slug}</code>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-500">{mod.order_index}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                          <BookOpen size={12} /> {lessonCount}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <form action={toggleModule.bind(null, mod.id, mod.is_published)}>
                          <button type="submit" className="cursor-pointer">
                            <span className={`inline-block size-2.5 rounded-full ${mod.is_published ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          </button>
                        </form>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/admin/modules/${mod.id}`} className="flex items-center gap-1 text-xs text-orange-500 font-semibold hover:underline">
                          Edit <ExternalLink size={11} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
