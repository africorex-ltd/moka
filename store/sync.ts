import { create } from 'zustand'

type SyncStatus = 'synced' | 'dirty' | 'offline'

interface SyncStore {
  status: SyncStatus
  isSyncing: boolean
  lastSyncedAt: string | null
  setStatus: (s: SyncStatus) => void
  setIsSyncing: (v: boolean) => void
  setLastSyncedAt: (v: string | null) => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: 'synced',
  isSyncing: false,
  lastSyncedAt: null,
  setStatus: (status) => set({ status }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}))
