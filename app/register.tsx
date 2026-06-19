import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar as RNStatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

const C = {
  green: '#2D5016',
  dark: '#1A3009',
  mid: '#4A5540',
  border: '#E5E7EB',
  error: '#DC2626',
  errorBg: '#FEF2F2',
}

function strengthLabel(p: string): { label: string; color: string; width: string } {
  if (p.length === 0) return { label: '', color: 'transparent', width: '0%' }
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  if (score <= 1) return { label: 'Weak', color: '#EF4444', width: '25%' }
  if (score <= 2) return { label: 'Fair', color: '#F59E0B', width: '50%' }
  if (score <= 3) return { label: 'Good', color: '#3B82F6', width: '75%' }
  return { label: 'Strong', color: '#22C55E', width: '100%' }
}

function InputRow({
  icon, placeholder, value, onChangeText, secureTextEntry, keyboardType,
  autoCapitalize, returnKeyType, onSubmitEditing, rightIcon,
}: {
  icon: string; placeholder: string; value: string
  onChangeText: (t: string) => void; secureTextEntry?: boolean
  keyboardType?: 'email-address' | 'default'; autoCapitalize?: 'none' | 'words'
  returnKeyType?: 'next' | 'done'; onSubmitEditing?: () => void
  rightIcon?: React.ReactNode
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
      paddingHorizontal: 14, backgroundColor: '#FAFAFA',
    }}>
      <Ionicons name={icon as never} size={18} color={C.mid} style={{ marginRight: 10 }} />
      <TextInput
        style={{ flex: 1, height: 52, color: C.dark, fontSize: 15 }}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      {rightIcon}
    </View>
  )
}

export default function RegisterScreen() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const strength = strengthLabel(password)

  function clearError() { setError('') }

  async function handleRegister() {
    setError('')
    if (!fullName.trim()) return setError('Please enter your full name')
    if (!email.trim() || !email.includes('@')) return setError('Please enter a valid email address')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')

    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: Linking.createURL('/auth/callback'),
      },
    })
    if (err) {
      setLoading(false)
      return setError(err.message)
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        role: 'farmer',
        status: 'active',
      })
      // Trigger welcome email (non-blocking — fails silently if not deployed)
      supabase.functions.invoke('send-welcome-email', {
        body: { name: fullName.trim(), email: email.trim().toLowerCase() },
      }).catch(() => {})
    }

    setLoading(false)
    setDone(true)
  }

  async function handleGoogle() {
    const redirectTo = Linking.createURL('/auth/callback')
    setGoogleLoading(true)
    setError('')
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })
    if (err || !data.url) {
      setGoogleLoading(false)
      return setError(err?.message ?? 'Google sign-up failed. Please try again.')
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    setGoogleLoading(false)
    if (result.type === 'success') router.replace('/')
  }

  // Email verification sent screen
  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: C.green }}>
        <RNStatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{
            width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center', justifyContent: 'center', marginBottom: 28,
          }}>
            <Ionicons name="mail" size={44} color="white" />
          </View>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
            Check your email
          </Text>
          <Text style={{ color: '#8FBA78', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
            We sent a confirmation link to{'\n'}
            <Text style={{ color: 'white', fontWeight: '600' }}>{email}</Text>
          </Text>
          <Text style={{ color: '#8FBA78', fontSize: 14, textAlign: 'center', marginTop: 16, lineHeight: 22 }}>
            Click the link in the email to activate your account, then come back and sign in.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: 'white', borderRadius: 14, height: 54,
              paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', marginTop: 40,
            }}
            onPress={() => router.replace('/login')}
          >
            <Text style={{ color: C.green, fontWeight: '700', fontSize: 16 }}>Go to Sign In</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.green }}>
      <RNStatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 36 }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}
              >
                <Ionicons name="arrow-back" size={20} color="white" />
              </TouchableOpacity>
              <Text style={{ color: 'white', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 }}>
                Create account
              </Text>
              <Text style={{ color: '#8FBA78', fontSize: 15, marginTop: 6 }}>
                Start managing your farm today
              </Text>
            </View>

            {/* Card */}
            <View style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 36, borderTopRightRadius: 36,
              paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40,
            }}>
              {/* Error */}
              {!!error && (
                <View style={{
                  backgroundColor: C.errorBg, borderRadius: 12, padding: 13,
                  marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 8,
                }}>
                  <Ionicons name="alert-circle" size={16} color={C.error} />
                  <Text style={{ color: C.error, fontSize: 13, flex: 1 }}>{error}</Text>
                </View>
              )}

              {/* Full name */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 7 }}>Full name</Text>
              <InputRow
                icon="person-outline"
                placeholder="e.g. John Kamau"
                value={fullName}
                onChangeText={(t) => { setFullName(t); clearError() }}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <View style={{ height: 14 }} />

              {/* Email */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 7 }}>Email address</Text>
              <InputRow
                icon="mail-outline"
                placeholder="you@example.com"
                value={email}
                onChangeText={(t) => { setEmail(t); clearError() }}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />

              <View style={{ height: 14 }} />

              {/* Password */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 7 }}>Password</Text>
              <InputRow
                icon="lock-closed-outline"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={(t) => { setPassword(t); clearError() }}
                secureTextEntry={!showPass}
                returnKeyType="next"
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPass(!showPass)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.mid} />
                  </TouchableOpacity>
                }
              />

              {/* Password strength */}
              {password.length > 0 && (
                <View style={{ marginTop: 8, marginBottom: 4 }}>
                  <View style={{ height: 4, backgroundColor: '#F3F4F6', borderRadius: 4 }}>
                    <View style={{ height: 4, width: strength.width as never, backgroundColor: strength.color, borderRadius: 4 }} />
                  </View>
                  <Text style={{ fontSize: 11, color: strength.color, marginTop: 4, fontWeight: '600' }}>
                    {strength.label}
                  </Text>
                </View>
              )}

              <View style={{ height: 14 }} />

              {/* Confirm password */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 7 }}>Confirm password</Text>
              <InputRow
                icon="shield-checkmark-outline"
                placeholder="Repeat your password"
                value={confirm}
                onChangeText={(t) => { setConfirm(t); clearError() }}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.mid} />
                  </TouchableOpacity>
                }
              />

              <View style={{ height: 28 }} />

              {/* Create account */}
              <TouchableOpacity
                style={{
                  backgroundColor: C.green, borderRadius: 14, height: 56,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: C.green, shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
                }}
                onPress={handleRegister}
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Create Account</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 22 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                <Text style={{ paddingHorizontal: 14, color: '#9CA3AF', fontSize: 13 }}>or sign up with</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
              </View>

              {/* Google */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
                  height: 54, gap: 10,
                }}
                onPress={handleGoogle}
                disabled={loading || googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator color={C.mid} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                    <Text style={{ color: C.dark, fontWeight: '600', fontSize: 15 }}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Sign in link */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 28 }}>
                <Text style={{ color: C.mid, fontSize: 14 }}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.replace('/login')}>
                  <Text style={{ color: C.green, fontWeight: '700', fontSize: 14 }}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
