import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { generateId } from '@/lib/database'
import EmptyState from '@/components/EmptyState'

interface Employee {
  local_id: string
  name: string
  phone: string | null
  role: string
  assignment: string
  salary_amount: number
  pay_period: string
  date_joined: string
  is_active: number
}

const ROLES = ['Milker', 'Farm hand', 'Driver', 'Guard', 'Supervisor', 'Other']
const ASSIGNMENTS = ['farm', 'sales point', 'delivery', 'admin']

export default function TeamScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [eName, setEName] = useState('')
  const [ePhone, setEPhone] = useState('')
  const [eRole, setERole] = useState('Milker')
  const [eAssignment, setEAssignment] = useState('farm')
  const [eSalary, setESalary] = useState('')
  const [ePayPeriod, setEPayPeriod] = useState('monthly')
  const [eJoined, setEJoined] = useState(dayjs().format('YYYY-MM-DD'))
  const [eNotes, setENotes] = useState('')

  const load = useCallback(async () => {
    const rows = await db.getAllAsync<Employee>(
      `SELECT * FROM employees WHERE deleted = 0 ORDER BY is_active DESC, name`
    )
    setEmployees(rows)
  }, [db])

  useEffect(() => { load() }, [load])

  async function saveEmployee() {
    if (!eName.trim()) return Alert.alert('Enter employee name')
    setSaving(true)
    await db.runAsync(
      `INSERT INTO employees (local_id, name, phone, role, assignment, salary_amount, pay_period, date_joined, notes, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [generateId(), eName.trim(), ePhone.trim() || null, eRole, eAssignment, parseFloat(eSalary) || 0, ePayPeriod, eJoined, eNotes.trim() || null]
    )
    setSaving(false)
    setShowModal(false)
    setEName('')
    setEPhone('')
    setESalary('')
    setENotes('')
    await load()
  }

  async function toggleActive(emp: Employee) {
    await db.runAsync(
      `UPDATE employees SET is_active = ?, dirty = 1 WHERE local_id = ?`,
      [emp.is_active ? 0 : 1, emp.local_id]
    )
    await load()
  }

  function renderEmployee({ item }: { item: Employee }) {
    return (
      <View className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm">
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="w-10 h-10 rounded-full bg-moka-light items-center justify-center">
              <Text className="text-moka-green font-bold">{item.name[0]}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-moka-dark font-bold text-sm">{item.name}</Text>
              <Text className="text-moka-text text-xs">{item.role} - {item.assignment}</Text>
              {item.phone ? <Text className="text-moka-text text-xs mt-0.5">{item.phone}</Text> : null}
              {item.salary_amount > 0 ? (
                <Text className="text-moka-mid text-xs mt-0.5">
                  KES {item.salary_amount.toLocaleString()}/{item.pay_period}
                </Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            className={`px-3 py-1.5 rounded-full ${item.is_active ? 'bg-moka-light' : 'bg-gray-100'}`}
            onPress={() => toggleActive(item)}
          >
            <Text className={`text-xs font-semibold ${item.is_active ? 'text-moka-green' : 'text-moka-text'}`}>
              {item.is_active ? 'Active' : 'Left'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 pt-12 pb-4 bg-moka-green">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Team</Text>
        </View>
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={employees}
        keyExtractor={(e) => e.local_id}
        renderItem={renderEmployee}
        contentContainerStyle={{ paddingVertical: 16 }}
        ListEmptyComponent={<EmptyState icon="people-outline" message="No employees" sub="Add your farm staff" />}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-gray-100">
              <Text className="text-moka-dark text-xl font-bold">Add Employee</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#4A5540" />
              </TouchableOpacity>
            </View>
            <View className="px-5 pt-4 gap-4">
              <View>
                <Text className="text-moka-mid text-sm mb-1">Full name *</Text>
                <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" value={eName} onChangeText={setEName} placeholder="John Kamau" autoFocus />
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-1">Phone</Text>
                <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" value={ePhone} onChangeText={setEPhone} placeholder="+254..." keyboardType="phone-pad" />
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-2">Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {ROLES.map((r) => (
                      <TouchableOpacity
                        key={r}
                        className={`px-3 py-2 rounded-full border ${eRole === r ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                        onPress={() => setERole(r)}
                      >
                        <Text className={`text-sm ${eRole === r ? 'text-white' : 'text-moka-mid'}`}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-2">Assignment</Text>
                <View className="flex-row flex-wrap gap-2">
                  {ASSIGNMENTS.map((a) => (
                    <TouchableOpacity
                      key={a}
                      className={`px-3 py-2 rounded-full border capitalize ${eAssignment === a ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                      onPress={() => setEAssignment(a)}
                    >
                      <Text className={`text-sm capitalize ${eAssignment === a ? 'text-white' : 'text-moka-mid'}`}>{a}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-moka-mid text-sm mb-1">Salary (KES)</Text>
                  <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" placeholder="0" keyboardType="decimal-pad" value={eSalary} onChangeText={setESalary} />
                </View>
                <View className="flex-1">
                  <Text className="text-moka-mid text-sm mb-2">Pay period</Text>
                  <View className="gap-1">
                    {['monthly', 'weekly', 'daily'].map((p) => (
                      <TouchableOpacity key={p} className={`py-1.5 rounded-lg border ${ePayPeriod === p ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`} onPress={() => setEPayPeriod(p)}>
                        <Text className={`text-sm capitalize text-center ${ePayPeriod === p ? 'text-white' : 'text-moka-mid'}`}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-1">Date joined</Text>
                <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" value={eJoined} onChangeText={setEJoined} placeholder="YYYY-MM-DD" />
              </View>
              <TouchableOpacity
                className="bg-moka-green rounded-xl py-4 items-center mb-6"
                onPress={saveEmployee}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Add Employee</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
