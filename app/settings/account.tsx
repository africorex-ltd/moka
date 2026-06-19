import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export default function AccountSettingsScreen() {
  const router = useRouter()
  const { session, setSession, setProfile } = useAuthStore()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleChangePassword() {
    if (!newPw.trim()) return Alert.alert('Enter new password')
    if (newPw.length < 8) return Alert.alert('Password must be at least 8 characters')
    if (newPw !== confirmPw) return Alert.alert('Passwords do not match')

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSaving(false)

    if (error) return Alert.alert('Error', error.message)
    Alert.alert('Success', 'Password updated')
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true)
          await supabase.auth.signOut()
          setSession(null)
          setProfile(null)
          setSigningOut(false)
          router.replace('/login')
        },
      },
    ])
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-row items-center px-4 pt-12 pb-4 bg-moka-green">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">My Account</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
        {/* Account info */}
        <View className="bg-moka-light rounded-2xl p-4">
          <Text className="text-moka-mid text-xs font-semibold uppercase tracking-wider mb-3">Account</Text>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-moka-text text-sm">Email</Text>
              <Text className="text-moka-dark text-sm">{session?.user.email ?? '-'}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-moka-text text-sm">Phone</Text>
              <Text className="text-moka-dark text-sm">{session?.user.phone ?? '-'}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-moka-text text-sm">Provider</Text>
              <Text className="text-moka-dark text-sm capitalize">
                {session?.user.app_metadata?.provider ?? 'email'}
              </Text>
            </View>
          </View>
        </View>

        {/* Change password */}
        <View>
          <Text className="text-moka-dark font-bold text-base mb-3">Change Password</Text>
          <View className="gap-3">
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="New password"
              secureTextEntry
              value={newPw}
              onChangeText={setNewPw}
            />
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="Confirm new password"
              secureTextEntry
              value={confirmPw}
              onChangeText={setConfirmPw}
            />
            <TouchableOpacity
              className="bg-moka-green rounded-xl py-3 items-center"
              onPress={handleChangePassword}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Update Password</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          className="border-2 border-moka-danger rounded-xl py-4 items-center flex-row justify-center gap-2"
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color="#C0392B" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#C0392B" />
              <Text className="text-moka-danger font-bold text-base">Sign Out</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
