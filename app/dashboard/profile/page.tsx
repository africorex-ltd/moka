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
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-moka-900">Farm Profile</h1>
        <p className="text-moka-700 text-sm mt-1">Manage your farm details and settings</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-moka-800 flex items-center justify-center text-white text-2xl font-black">
            {(profile?.full_name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-bold text-moka-900">{profile?.full_name ?? '—'}</div>
            <div className="text-moka-600 text-sm">{user?.email}</div>
          </div>
        </div>
        <ProfileForm profile={profile} userId={user!.id} />
      </div>
    </div>
  )
}
