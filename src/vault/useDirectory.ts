import { useSyncExternalStore } from 'react'
import { getDirectory, subscribeDirectory, type DirectoryState } from './directory'

export function useDirectory(): DirectoryState {
  return useSyncExternalStore(subscribeDirectory, getDirectory)
}
