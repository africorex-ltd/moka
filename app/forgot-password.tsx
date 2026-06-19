import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar as RNStatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

const C = {
  green: '#2D5016',
  dark: '#1A3009',
  mid: '#4A5540',
  border: '#E5E7EB',
  error: '#DC2626',
  errorBg: '#FEF2F2',
}

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSend() {
    setError('')
    if (!email.trim() || !email.includes('@')) return setError('Please enter a valid email address')

    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'moka://reset-password',
    })
    setLoading(false)
    if (err) return setError(err.message)
    setSent(true)
  }

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: C.green }}>
        <RNStatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{
            width: 88, height: 88, borderRadius: 44,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center', justifyContent: 'center', marginBottom: 28,
          }}>
            <Ionicons name="checkmark-circle" size={48} color="white" />
          </View>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
            Email sent!
          </Text>
          <Text style={{ color: '#8FBA78', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
            We sent a password reset link to{'\n'}
            <Text style={{ color: 'white', fontWeight: '600' }}>{email}</Text>
          </Text>
          <Text style={{ color: '#8FBA78', fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 22 }}>
            Check your inbox and follow the link to reset your password.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: 'white', borderRadius: 14, height: 54,
              paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', marginTop: 40,
            }}
            onPress={() => router.replace('/login')}
          >
            <Text style={{ color: C.green, fontWeight: '700', fontSize: 16 }}>Back to Sign In</Text>
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
          {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center', marginBottom: 32,
              }}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 }}>
              Reset password
            </Text>
            <Text style={{ color: '#8FBA78', fontSize: 15, marginTop: 6 }}>
              We'll send a reset link to your email
            </Text>
          </View>

          {/* Card */}
          <View style={{
            flex: 1, backgroundColor: 'white',
            borderTopLeftRadius: 36, borderTopRightRadius: 36,
            paddingHorizontal: 28, paddingTop: 36,
          }}>
            {!!error && (
              <View style={{
                backgroundColor: C.errorBg, borderRadius: 12, padding: 13,
                marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 8,
              }}>
                <Ionicons name="alert-circle" size={16} color={C.error} />
                <Text style={{ color: C.error, fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            )}

            <Text style={{ fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 7 }}>
              Email address
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
              paddingHorizontal: 14, backgroundColor: '#FAFAFA',
            }}>
              <Ionicons name="mail-outline" size={18} color={C.mid} style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, height: 52, color: C.dark, fontSize: 15 }}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={(t) => { setEmail(t); setError('') }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSend}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: C.green, borderRadius: 14, height: 56,
                alignItems: 'center', justifyContent: 'center', marginTop: 28,
                shadowColor: C.green, shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
              }}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
