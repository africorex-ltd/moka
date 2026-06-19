import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

export default function RegisterScreen() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      return Alert.alert('Missing fields', 'Name, email and password are required')
    }
    if (password.length < 8) {
      return Alert.alert('Weak password', 'Password must be at least 8 characters')
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim() },
      },
    })
    if (error) {
      setLoading(false)
      return Alert.alert('Registration failed', error.message)
    }

    if (data.user) {
      // Create profile row
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: 'farmer',
        status: 'active',
      })
    }
    setLoading(false)
    router.replace('/')
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="bg-moka-green px-6 pt-16 pb-8 flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-2xl font-bold">Create Account</Text>
            <Text className="text-moka-text text-sm">Start managing your farm</Text>
          </View>
        </View>

        <View className="px-6 pt-6">
          <Text className="text-moka-mid text-sm mb-2">Full name</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-3"
            placeholder="John Kamau"
            value={fullName}
            onChangeText={setFullName}
            autoFocus
          />

          <Text className="text-moka-mid text-sm mb-2">Email address</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-3"
            placeholder="farmer@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text className="text-moka-mid text-sm mb-2">Phone (optional)</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-3"
            placeholder="+254712345678"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text className="text-moka-mid text-sm mb-2">Password</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-6"
            placeholder="At least 8 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            className="bg-moka-green rounded-xl py-4 items-center mb-4"
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Create Account</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center">
            <Text className="text-moka-mid">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text className="text-moka-green font-semibold">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
