import { createClient } from '@/lib/supabase/server'
import { TravelContent } from '@/components/travel/travel-content'

export default async function TravelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let languageCode = 'es'
  let destination: string | null = null

  if (user) {
    const [langResult, profileResult] = await Promise.all([
      supabase
        .from('user_languages')
        .select('language_code')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('travel_destination')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    if (langResult.data?.language_code) languageCode = langResult.data.language_code
    if (profileResult.data?.travel_destination) destination = profileResult.data.travel_destination
  }

  return <TravelContent languageCode={languageCode} destination={destination} />
}
