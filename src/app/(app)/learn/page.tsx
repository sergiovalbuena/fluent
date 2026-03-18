import { createClient } from '@/lib/supabase/server'
import { AppTopbar } from '@/components/layout/app-topbar'
import { PathMap, type PathNode } from '@/components/learn/path-map'

const LANGUAGE_NAMES: Record<string, { name: string; flag: string }> = {
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
  pt: { name: 'Portuguese', flag: '🇧🇷' },
  en: { name: 'English', flag: '🇺🇸' },
  de: { name: 'German', flag: '🇩🇪' },
  it: { name: 'Italian', flag: '🇮🇹' },
  ja: { name: 'Japanese', flag: '🇯🇵' },
  zh: { name: 'Chinese', flag: '🇨🇳' },
}

export default async function LearnPage() {
  const supabase = await createClient()

  // Resolve user's active language (fallback to 'es')
  const { data: { user } } = await supabase.auth.getUser()
  let languageCode = 'es'
  if (user) {
    const { data: activeLang } = await supabase
      .from('user_languages')
      .select('language_code')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (activeLang?.language_code) languageCode = activeLang.language_code
  }

  const { data } = await supabase
    .from('modules')
    .select('*, lessons(id)')
    .eq('language_code', languageCode)
    .eq('is_published', true)
    .order('order_index')

  const modules = data ?? []

  const nodes: PathNode[] = modules.map((m: {
    id: string
    slug: string
    title: string
    icon: string
    lessons: { id: string }[]
  }, i: number) => ({
    id: m.id,
    slug: m.slug,
    title: m.title,
    icon: m.icon,
    progress: 0,
    state: i === 0 ? 'current' : 'available',
  }))

  const lang = LANGUAGE_NAMES[languageCode] ?? { name: languageCode.toUpperCase(), flag: '🌐' }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#23140f]">
      <AppTopbar
        title="Learning Path"
        subtitle={`${lang.flag} ${lang.name}`}
      />

      <main className="flex-1">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-4">
            <span className="text-5xl">📚</span>
            <h2 className="text-xl font-bold">No lessons yet</h2>
            <p className="text-muted-foreground text-sm">Check back soon for new content.</p>
          </div>
        ) : (
          <PathMap nodes={nodes} languageName={lang.name} languageFlag={lang.flag} />
        )}
      </main>
    </div>
  )
}
