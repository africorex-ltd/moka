import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-moka-900">Farm Profile & Settings</h1>
        <p className="text-moka-600 text-sm mt-1">
          This information appears on your reports, invoices, and documents.
        </p>
      </div>
      <ProfileForm profile={profile} userId={user!.id} />
    </div>
  )
}
