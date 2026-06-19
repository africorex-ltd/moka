import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

type Tab = 'otp' | 'email' | 'phone' | 'google'

export default function LoginScreen() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('otp')
  const [loading, setLoading] = useState(false)

  // OTP state
  const [otpPhone, setOtpPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone')

  // Email state
  const [email, setEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')

  // Phone+password state
  const [ppPhone, setPpPhone] = useState('')
  const [ppPassword, setPpPassword] = useState('')

  async function handleOtpSend() {
    if (!otpPhone.trim()) return Alert.alert('Enter your phone number')
    const phone = otpPhone.startsWith('+') ? otpPhone : `+254${otpPhone.replace(/^0/, '')}`
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone })
    setLoading(false)
    if (error) return Alert.alert('Error', error.message)
    setOtpStep('code')
  }

  async function handleOtpVerify() {
    if (!otpCode.trim()) return Alert.alert('Enter the OTP code')
    const phone = otpPhone.startsWith('+') ? otpPhone : `+254${otpPhone.replace(/^0/, '')}`
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ phone, token: otpCode, type: 'sms' })
    setLoading(false)
    if (error) return Alert.alert('Error', error.message)
    router.replace('/')
  }

  async function handleEmailLogin() {
    if (!email.trim() || !emailPassword.trim()) return Alert.alert('Fill in all fields')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: emailPassword })
    setLoading(false)
    if (error) return Alert.alert('Error', error.message)
    router.replace('/')
  }

  async function handlePhonePasswordLogin() {
    if (!ppPhone.trim() || !ppPassword.trim()) return Alert.alert('Fill in all fields')
    const phone = ppPhone.startsWith('+') ? ppPhone : `+254${ppPhone.replace(/^0/, '')}`
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ phone, password: ppPassword })
    setLoading(false)
    if (error) return Alert.alert('Error', error.message)
    router.replace('/')
  }

  async function handleGoogleLogin() {
    const redirectTo = Linking.createURL('/auth/callback')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })
    if (error || !data.url) {
      setLoading(false)
      return Alert.alert('Error', error?.message ?? 'Could not open Google sign-in')
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    setLoading(false)
    if (result.type === 'success') {
      router.replace('/')
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'otp', label: 'OTP' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'google', label: 'Google' },
  ]

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="bg-moka-green px-6 pt-16 pb-8">
          <Text className="text-white text-3xl font-bold">Moka</Text>
          <Text className="text-moka-text text-sm mt-1">Smart Farm Companion</Text>
        </View>

        <View className="px-6 pt-6">
          <Text className="text-moka-dark text-xl font-bold mb-6">Sign In</Text>

          {/* Tabs */}
          <View className="flex-row bg-moka-light rounded-xl p-1 mb-6">
            {tabs.map((t) => (
              <TouchableOpacity
                key={t.key}
                className={`flex-1 py-2 rounded-lg items-center ${tab === t.key ? 'bg-moka-green' : ''}`}
                onPress={() => { setTab(t.key); setOtpStep('phone') }}
              >
                <Text className={`text-xs font-semibold ${tab === t.key ? 'text-white' : 'text-moka-mid'}`}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* OTP Tab */}
          {tab === 'otp' && (
            <View>
              {otpStep === 'phone' ? (
                <>
                  <Text className="text-moka-mid text-sm mb-2">Phone number</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-4"
                    placeholder="+254712345678 or 0712345678"
                    keyboardType="phone-pad"
                    value={otpPhone}
                    onChangeText={setOtpPhone}
                    autoFocus
                  />
                  <TouchableOpacity
                    className="bg-moka-green rounded-xl py-4 items-center"
                    onPress={handleOtpSend}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Send OTP</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text className="text-moka-mid text-sm mb-1">Code sent to {otpPhone}</Text>
                  <TouchableOpacity onPress={() => setOtpStep('phone')}>
                    <Text className="text-moka-gold text-sm mb-4">Change number</Text>
                  </TouchableOpacity>
                  <Text className="text-moka-mid text-sm mb-2">6-digit code</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-4 text-center text-2xl tracking-widest"
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    autoFocus
                  />
                  <TouchableOpacity
                    className="bg-moka-green rounded-xl py-4 items-center"
                    onPress={handleOtpVerify}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Verify</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Email Tab */}
          {tab === 'email' && (
            <View>
              <Text className="text-moka-mid text-sm mb-2">Email address</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-3"
                placeholder="farmer@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <Text className="text-moka-mid text-sm mb-2">Password</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-4"
                placeholder="Password"
                secureTextEntry
                value={emailPassword}
                onChangeText={setEmailPassword}
              />
              <TouchableOpacity
                className="bg-moka-green rounded-xl py-4 items-center"
                onPress={handleEmailLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Sign In</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Phone + Password Tab */}
          {tab === 'phone' && (
            <View>
              <Text className="text-moka-mid text-sm mb-2">Phone number</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-3"
                placeholder="+254712345678 or 0712345678"
                keyboardType="phone-pad"
                value={ppPhone}
                onChangeText={setPpPhone}
              />
              <Text className="text-moka-mid text-sm mb-2">Password</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-4"
                placeholder="Password"
                secureTextEntry
                value={ppPassword}
                onChangeText={setPpPassword}
              />
              <TouchableOpacity
                className="bg-moka-green rounded-xl py-4 items-center"
                onPress={handlePhonePasswordLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Sign In</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Google Tab */}
          {tab === 'google' && (
            <TouchableOpacity
              className="border-2 border-gray-200 rounded-xl py-4 flex-row items-center justify-center gap-3"
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={22} color="#4A5540" />
              {loading ? (
                <ActivityIndicator color="#4A5540" />
              ) : (
                <Text className="text-moka-mid font-semibold text-base">Continue with Google</Text>
              )}
            </TouchableOpacity>
          )}

          <View className="flex-row justify-center mt-6 mb-4">
            <Text className="text-moka-mid">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text className="text-moka-green font-semibold">Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
