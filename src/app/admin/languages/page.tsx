import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

type LanguageRow = {
  code: string
  name: string
  native_name: string
  flag_emoji: string
  is_available: boolean
}

async function toggleLanguage(code: string, current: boolean) {
  'use server'
  const supabase = createAdminClient()
  await supabase.from('languages').update({ is_available: !current }).eq('code', code)
  revalidatePath('/admin/languages')
}

export default async function LanguagesPage() {
  const supabase = createAdminClient()

  const [{ data: languages }, { data: moduleCounts }] = await Promise.all([
    supabase.from('languages').select('code, name, native_name, flag_emoji, is_available').order('name'),
    supabase.from('modules').select('language_code, id').eq('is_published', true),
  ])

  const langList = (languages ?? []) as LanguageRow[]
  const countMap = (moduleCounts ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.language_code] = (acc[m.language_code] ?? 0) + 1
    return acc
  }, {})

  const availableCount = langList.filter(l => l.is_available).length

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Languages</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {availableCount} of {langList.length} languages available to learners
        </p>
      </div>

      {/* Summary bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          {langList.map(lang => (
            <div
              key={lang.code}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                lang.is_available
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <span>{lang.flag_emoji}</span>
              <span>{lang.name}</span>
              <span className="text-[10px] opacity-60">{lang.is_available ? '✓' : '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Language cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {langList.map(lang => {
          const moduleCount = countMap[lang.code] ?? 0
          return (
            <div key={lang.code} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4 p-5">
                <span className="text-4xl leading-none">{lang.flag_emoji}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900">{lang.name}</h3>
                  <p className="text-xs text-slate-400">{lang.native_name}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen size={11} /> {moduleCount} modules
                    </span>
                    <span className={`font-semibold ${lang.is_available ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {lang.is_available ? '● Available' : '○ Hidden'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-3 bg-slate-50">
                <Link
                  href={`/admin/modules?lang=${lang.code}`}
                  className="text-xs text-orange-500 font-semibold hover:underline"
                >
                  View modules →
                </Link>
                <form action={toggleLanguage.bind(null, lang.code, lang.is_available)}>
                  <button
                    type="submit"
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      lang.is_available
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {lang.is_available ? 'Disable' : 'Enable'}
                  </button>
                </form>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
