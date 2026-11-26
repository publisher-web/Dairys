import { REMOTELY_SAVE_FOLDER, VAULT_NAME } from '../config'
import { getMetadata, listFolder } from './api'

const ROOT_KEY = 'dairys.vaultRoot'

export async function resolveVaultRoot(refresh = false): Promise<string> {
  if (!refresh) {
    try {
      const cached = localStorage.getItem(ROOT_KEY)
      if (cached) return cached
    } catch {
      void 0
    }
  }
  const top = await listFolder('')
  for (const folder of top.filter((e) => e['.tag'] === 'folder')) {
    const candidate = `${folder.path_display}/${REMOTELY_SAVE_FOLDER}/${VAULT_NAME}`
    const meta = await getMetadata(candidate)
    if (meta?.['.tag'] === 'folder') {
      try {
        localStorage.setItem(ROOT_KEY, meta.path_display)
      } catch {
        void 0
      }
      return meta.path_display
    }
  }
  throw new Error(`Vault が見つかりません: */${REMOTELY_SAVE_FOLDER}/${VAULT_NAME}`)
}
