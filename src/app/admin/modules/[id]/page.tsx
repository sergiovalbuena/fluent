import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LessonEditor } from '@/components/admin/lesson-editor'
import { ChevronLeft, Plus } from 'lucide-react'

const LESSON_TYPES = ['vocabulary', 'phrases', 'qa', 'story', 'arrange', 'translate']

const TYPE_COLORS: Record<string, string> = {
  vocabulary: 'bg-indigo-100 text-indigo-700',
  phrases:    'bg-teal-100 text-teal-700',
  qa:         'bg-purple-100 text-purple-700',
  story:      'bg-amber-100 text-amber-700',
  arrange:    'bg-cyan-100 text-cyan-700',
  translate:  'bg-rose-100 text-rose-700',
}

type LessonRow = {
  id: string
  title: string
  type: string
  content: Record<string, unknown>
  order_index: number
  is_published: boolean
}

type ModuleRow = {
  id: string
  title: string
  icon: string
  slug: string
  language_code: string
  order_index: number
  is_published: boolean
  description: string | null
}

async function toggleLesson(id: string, current: boolean, moduleId: string) {
  'use server'
  const supabase = createAdminClient()
  await supabase.from('lessons').update({ is_published: !current }).eq('id', id)
  revalidatePath(`/admin/modules/${moduleId}`)
}

async function deleteLesson(id: string, moduleId: string) {
  'use server'
  const supabase = createAdminClient()
  await supabase.from('lessons').delete().eq('id', id)
  revalidatePath(`/admin/modules/${moduleId}`)
}

async function addLesson(formData: FormData) {
  'use server'
  const type = formData.get('type') as string
  const title = formData.get('title') as string
  const moduleId = formData.get('_moduleId') as string
  if (!type || !title || !moduleId) return
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: false })
    .limit(1)
  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1
  await supabase.from('lessons').insert({
    module_id: moduleId,
    type,
    title,
    content: {},
    order_index: nextOrder,
    is_published: false,
  })
  revalidatePath(`/admin/modules/${moduleId}`)
}

async function updateLessonContent(id: string, title: string, contentJson: string, moduleId: string) {
  'use server'
  const supabase = createAdminClient()
  const content = JSON.parse(contentJson) as Record<string, unknown>
  await supabase.from('lessons').update({ title, content }).eq('id', id)
  revalidatePath(`/admin/modules/${moduleId}`)
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ModuleDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: mod }, { data: lessons }] = await Promise.all([
    supabase.from('modules').select('*').eq('id', id).maybeSingle(),
    supabase.from('lessons').select('*').eq('module_id', id).order('order_index'),
  ])

  if (!mod) notFound()

  const module = mod as ModuleRow
  const lessonList = (lessons ?? []) as LessonRow[]

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      {/* Header */}
      <div>
        <Link href="/admin/modules" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ChevronLeft size={14} /> Modules
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{module.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{module.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{module.slug}</code>
                <span className="text-xs text-slate-400">{module.language_code.toUpperCase()}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${module.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {module.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">{lessonList.length} Lessons</h2>
        </div>

        {lessonList.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">No lessons yet. Add one below.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {lessonList.map(lesson => (
              <LessonEditor
                key={lesson.id}
                lesson={lesson}
                moduleId={id}
                onToggle={toggleLesson.bind(null, lesson.id, lesson.is_published, id)}
                onDelete={deleteLesson.bind(null, lesson.id, id)}
                onSave={updateLessonContent.bind(null, lesson.id)}
                typeColors={TYPE_COLORS}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Lesson form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Plus size={15} className="text-orange-500" /> Add Lesson
        </h3>
        <form action={addLesson}>
          <input type="hidden" name="_moduleId" value={id} />
          <div className="flex flex-col md:flex-row gap-3">
            <select
              name="type"
              required
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-orange-400"
            >
              <option value="">— Select type —</option>
              {LESSON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              name="title"
              required
              placeholder="Lesson title"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-orange-400"
            />
            <button
              type="submit"
              className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
