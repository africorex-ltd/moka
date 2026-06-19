import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Image, StatusBar as RNStatusBar,
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

function InputRow({
  icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize,
  returnKeyType, onSubmitEditing, rightIcon,
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

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  function clearError() { setError('') }

  async function handleSignIn() {
    setError('')
    if (!email.trim()) return setError('Please enter your email address')
    if (!password) return setError('Please enter your password')

    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    setLoading(false)
    if (err) return setError(err.message)
    router.replace('/')
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
      return setError(err?.message ?? 'Google sign-in failed. Please try again.')
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    setGoogleLoading(false)
    if (result.type === 'success') router.replace('/')
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
            {/* Branding */}
            <View style={{ alignItems: 'center', paddingTop: 36, paddingBottom: 44 }}>
              <Image
                source={require('../assets/icon.png')}
                style={{ width: 84, height: 84, borderRadius: 22 }}
              />
              <Text style={{ color: 'white', fontSize: 36, fontWeight: '800', marginTop: 16, letterSpacing: -1 }}>
                Moka
              </Text>
              <Text style={{ color: '#8FBA78', fontSize: 15, marginTop: 4 }}>
                Smart Farm Companion
              </Text>
            </View>

            {/* White card */}
            <View style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 36, borderTopRightRadius: 36,
              paddingHorizontal: 28, paddingTop: 36, paddingBottom: 40,
              minHeight: 460,
            }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: C.dark, letterSpacing: -0.5 }}>
                Welcome back
              </Text>
              <Text style={{ color: C.mid, fontSize: 15, marginTop: 4, marginBottom: 28 }}>
                Sign in to manage your farm
              </Text>

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

              {/* Email */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 7 }}>
                Email address
              </Text>
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
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 7 }}>
                Password
              </Text>
              <InputRow
                icon="lock-closed-outline"
                placeholder="Your password"
                value={password}
                onChangeText={(t) => { setPassword(t); clearError() }}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPass(!showPass)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.mid} />
                  </TouchableOpacity>
                }
              />

              {/* Forgot password */}
              <TouchableOpacity
                onPress={() => router.push('/forgot-password' as never)}
                style={{ alignSelf: 'flex-end', marginTop: 10, marginBottom: 26 }}
              >
                <Text style={{ color: C.green, fontSize: 13, fontWeight: '600' }}>
                  Forgot password?
                </Text>
              </TouchableOpacity>

              {/* Sign In button */}
              <TouchableOpacity
                style={{
                  backgroundColor: C.green, borderRadius: 14, height: 56,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: C.green, shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
                }}
                onPress={handleSignIn}
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Sign In</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 22 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                <Text style={{ paddingHorizontal: 14, color: '#9CA3AF', fontSize: 13 }}>
                  or continue with
                </Text>
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

              {/* Sign up */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 28 }}>
                <Text style={{ color: C.mid, fontSize: 14 }}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={{ color: C.green, fontWeight: '700', fontSize: 14 }}>
                    Create account
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
