'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay',
  'Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii',
  'Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera',
  'Marsabit','Meru','Migori','Mombasa',"Murang'a",'Nairobi','Nakuru','Nandi',
  'Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta',
  'Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga',
  'Wajir','West Pokot',
]

const MILK_MARKETS = [
  { id: 'kcc',      label: 'KCC / Dairy Co-operative', icon: '🏭' },
  { id: 'private',  label: 'Private Buyers',           icon: '🏪' },
  { id: 'retail',   label: 'Direct to Consumers',      icon: '🏠' },
  { id: 'multiple', label: 'Multiple Channels',         icon: '📦' },
]

type Profile = Record<string, unknown>

export default function ProfileForm({ profile, userId }: { profile: Profile | null; userId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [logoUrl, setLogoUrl] = useState<string>((profile?.farm_logo_url as string) ?? '')
  const [form, setForm] = useState({
    full_name:           (profile?.full_name as string)           ?? '',
    farm_name:           (profile?.farm_name as string)           ?? '',
    farm_registration_no:(profile?.farm_registration_no as string)?? '',
    farm_address:        (profile?.farm_address as string)        ?? '',
    county:              (profile?.county as string)              ?? '',
    farm_phone:          (profile?.farm_phone as string)          ?? '',
    farm_email:          (profile?.farm_email as string)          ?? '',
    location:            (profile?.location as string)            ?? '',
    default_milk_price:  (profile?.default_milk_price as number)?.toString() ?? '',
    milk_market:         (profile?.milk_market as string)         ?? 'private',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be under 2 MB'); return }
    setUploading(true)
    setError('')
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${userId}/logo.${ext}`
      const { error: upErr } = await supabase.storage.from('farm-logos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('farm-logos').getPublicUrl(path)
      setLogoUrl(publicUrl + `?t=${Date.now()}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('profiles').upsert({
        id: userId,
        full_name:           form.full_name  || null,
        farm_name:           form.farm_name  || null,
        farm_registration_no:form.farm_registration_no || null,
        farm_address:        form.farm_address || null,
        county:              form.county || null,
        farm_phone:          form.farm_phone || null,
        farm_email:          form.farm_email || null,
        location:            form.location || null,
        default_milk_price:  form.default_milk_price ? parseFloat(form.default_milk_price) : null,
        milk_market:         form.milk_market,
        farm_logo_url:       logoUrl || null,
      })
      if (err) throw err
      setSaved(true)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* ── Logo & Farm Identity ── */}
      <Section title="Farm Identity" desc="Your logo and name appear on all reports and documents">
        <div className="flex items-start gap-6 mb-5">
          {/* Logo preview */}
          <div className="shrink-0">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <Image src={logoUrl} alt="Farm logo" width={96} height={96} className="w-full h-full object-cover" unoptimized />
              ) : (
                <div className="text-center p-2">
                  <div className="text-3xl mb-1">🌾</div>
                  <div className="text-[10px] text-moka-400">No logo</div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-2 w-24 text-center text-xs font-semibold text-moka-700 hover:text-moka-900 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
            <p className="text-[10px] text-moka-400 mt-1 text-center w-24">PNG or JPG · Max 2 MB</p>
          </div>

          <div className="flex-1 space-y-4">
            <Row>
              <Field label="Farm Name *">
                <input className={inp} value={form.farm_name} onChange={e => set('farm_name', e.target.value)} placeholder="e.g. Kilimo Dairy Farm" required />
              </Field>
              <Field label="Registration No. (optional)">
                <input className={inp} value={form.farm_registration_no} onChange={e => set('farm_registration_no', e.target.value)} placeholder="e.g. KRA-PIN or Reg No." />
              </Field>
            </Row>
          </div>
        </div>
      </Section>

      {/* ── Contact Details ── */}
      <Section title="Contact Details" desc="Used on reports, delivery notes and correspondence">
        <div className="space-y-4">
          <Row>
            <Field label="Owner / Manager Name">
              <input className={inp} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" />
            </Field>
            <Field label="Farm Email">
              <input type="email" className={inp} value={form.farm_email} onChange={e => set('farm_email', e.target.value)} placeholder="farm@example.com" />
            </Field>
          </Row>
          <Row>
            <Field label="Phone Number">
              <input type="tel" className={inp} value={form.farm_phone} onChange={e => set('farm_phone', e.target.value)} placeholder="+254 7XX XXX XXX" />
            </Field>
            <Field label="County">
              <select className={inp} value={form.county} onChange={e => set('county', e.target.value)}>
                <option value="">— Select county —</option>
                {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </Row>
          <Field label="Farm Address">
            <textarea className={inp} rows={2} value={form.farm_address} onChange={e => set('farm_address', e.target.value)} placeholder="Physical address, town / sub-county" />
          </Field>
          <Field label="Town / Area (for reports header)">
            <input className={inp} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Nakuru, Rift Valley" />
          </Field>
        </div>
      </Section>

      {/* ── Milk Business ── */}
      <Section title="Milk Business" desc="Controls which features and reports are shown in your dashboard">
        <div className="space-y-3 mb-5">
          {MILK_MARKETS.map(m => (
            <label key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              form.milk_market === m.id ? 'border-moka-700 bg-moka-50' : 'border-gray-100 hover:border-moka-200'
            }`}>
              <input type="radio" name="milk_market" value={m.id} checked={form.milk_market === m.id}
                onChange={e => set('milk_market', e.target.value)} className="sr-only" />
              <span className="text-xl">{m.icon}</span>
              <span className="text-sm font-semibold text-moka-900">{m.label}</span>
              <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                form.milk_market === m.id ? 'border-moka-700 bg-moka-700' : 'border-gray-300'
              }`}>
                {form.milk_market === m.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </label>
          ))}
        </div>
        <Field label="Default Milk Price (KES per litre)">
          <input type="number" step="0.1" min="0" className={inp} value={form.default_milk_price}
            onChange={e => set('default_milk_price', e.target.value)} placeholder="e.g. 45" />
        </Field>
      </Section>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <span>⚠</span> {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 bg-moka-50 border border-moka-200 text-moka-800 text-sm rounded-xl px-4 py-3">
          <span>✓</span> Farm profile saved successfully.
        </div>
      )}

      {/* Preview badge */}
      {(form.farm_name || logoUrl) && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
          <div className="text-xs font-semibold text-moka-500 uppercase tracking-wide mb-3">Preview — Report header</div>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" width={56} height={56} className="w-14 h-14 rounded-xl object-cover" unoptimized />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-moka-100 flex items-center justify-center text-2xl">🌾</div>
            )}
            <div>
              <div className="font-black text-moka-900 text-lg">{form.farm_name || 'Your Farm Name'}</div>
              {form.farm_address && <div className="text-moka-600 text-xs">{form.farm_address}</div>}
              <div className="text-moka-500 text-xs">
                {[form.county, form.farm_phone].filter(Boolean).join(' · ')}
              </div>
              {form.farm_registration_no && (
                <div className="text-moka-400 text-xs">Reg: {form.farm_registration_no}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button type="submit" disabled={saving || uploading} className="px-8 py-3 rounded-xl bg-moka-800 text-white text-sm font-bold hover:bg-moka-900 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
        <span className="text-xs text-moka-400">Changes appear immediately on all reports</span>
      </div>
    </form>
  )
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 bg-moka-50/50">
        <h3 className="font-bold text-moka-900 text-sm">{title}</h3>
        <p className="text-moka-500 text-xs mt-0.5">{desc}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-moka-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-moka-900 text-sm focus:outline-none focus:ring-2 focus:ring-moka-700 focus:border-transparent bg-white placeholder-gray-400 transition-shadow'
