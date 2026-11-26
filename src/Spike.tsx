import { useState } from 'react'
import { DIARY_FOLDER } from './config'
import { DropboxError, deletePath, downloadText, getMetadata, listFolder, listFolderRecursive, upload } from './dropbox/api'
import { logout } from './dropbox/auth'
import { resolveVaultRoot } from './dropbox/vault'

type Log = { ok: boolean; text: string }

const TEST_NAMES = ['dairys-test.md', 'dairys-テスト.md']

const STRAY_CHAIN = ['/Apps', '/Apps/remotely-save', '/Apps/remotely-save/Diary', '/Apps/remotely-save/Diary/40_Diary']

function testPaths(root: string): string[] {
  return TEST_NAMES.map((name) => `${root}/${DIARY_FOLDER}/${name}`)
}

function testContent(label: string): string {
  return ['---', 'type: dairys-test', `written: "${new Date().toISOString()}"`, '---', '', `- ${label} 日本語テスト ✅`, ''].join('\n')
}

export default function Spike({ onLogout }: { onLogout: () => void }) {
  const [logs, setLogs] = useState<Log[]>([])
  const [busy, setBusy] = useState(false)

  const push = (ok: boolean, text: string) => setLogs((prev) => [...prev, { ok, text }])

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(true)
    push(true, `▶ ${name}`)
    try {
      await fn()
    } catch (e) {
      push(false, e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const checkVault = () =>
    run('Vault の確認', async () => {
      const top = await listFolder('')
      push(true, `Dropbox 直下: ${top.map((e) => e.name).join(', ')}`)
      const root = await resolveVaultRoot(true)
      push(true, `Vault: ${root}`)
      const rootEntries = await listFolder(root)
      push(true, `直下 ${rootEntries.length}件 (${rootEntries.map((e) => e.name).slice(0, 12).join(', ')})`)
      const diary = (await listFolder(`${root}/${DIARY_FOLDER}`)).filter((e) => e['.tag'] === 'file')
      push(true, `${DIARY_FOLDER}: ${diary.length}ファイル`)
      const people = await listFolder(`${root}/30_HumanNetwork/10_People`)
      push(true, `10_People: ${people.length}件`)
      const latest = diary.filter((e) => /^\d{4}-\d{2}-\d{2}\.md$/.test(e.name)).sort((a, b) => b.name.localeCompare(a.name))[0]
      if (latest) {
        const text = await downloadText(latest.path_display)
        push(true, `最新の日記 ${latest.name} を読み取り: ${text.length}文字`)
      }
    })

  const writeTest = () =>
    run('書き込みと読み戻し', async () => {
      const root = await resolveVaultRoot()
      for (const path of testPaths(root)) {
        const content = testContent('書き込み')
        const entry = await upload(path, content, { kind: 'overwrite' })
        const back = await downloadText(path)
        push(back === content, `${entry.path_display} rev=${entry.rev} 読み戻し${back === content ? '一致' : '不一致'}`)
      }
    })

  const lockTest = () =>
    run('楽観ロック（rev 指定の更新）', async () => {
      const root = await resolveVaultRoot()
      const path = testPaths(root)[0]
      const meta = await getMetadata(path)
      if (!meta?.rev) throw new Error('先に書き込みテストを実行してください')
      const updated = await upload(path, testContent('rev 一致で更新'), { kind: 'update', rev: meta.rev })
      push(true, `最新 rev で更新: 成功 rev=${updated.rev}`)
      try {
        await upload(path, testContent('古い rev で更新'), { kind: 'update', rev: meta.rev })
        push(false, '古い rev で更新: 成功してしまった（競合を検出できない）')
      } catch (e) {
        if (e instanceof DropboxError && e.isConflict) push(true, '古い rev で更新: 競合として拒否された（期待どおり）')
        else throw e
      }
    })

  const cleanupStray = () =>
    run('誤って作った /Apps/remotely-save/Diary の片付け', async () => {
      const root = await resolveVaultRoot(true)
      if (root.toLowerCase() === '/apps/remotely-save/diary') throw new Error('Vault 本体が /Apps 配下のため片付けを中止')
      for (const folder of STRAY_CHAIN) {
        const meta = await getMetadata(folder)
        if (!meta) {
          push(true, `${folder}: 存在しない`)
          return
        }
        const files = (await listFolderRecursive(folder)).filter((e) => e['.tag'] === 'file')
        const onlyTests = files.every((f) => TEST_NAMES.includes(f.name) && f.path_display.toLowerCase().startsWith('/apps/remotely-save/diary/40_diary/'))
        push(true, `${folder}: ファイル${files.length}件 ${onlyTests ? '（テストファイルのみ）' : '（他のファイルあり）'}`)
        if (onlyTests) {
          await deletePath(folder)
          push(true, `${folder} を削除しました`)
          return
        }
      }
      push(false, 'テストファイル以外を含むため削除しませんでした')
    })

  return (
    <section className="spike">
      <h2>技術検証（Step 1）</h2>
      <div className="buttons">
        <button disabled={busy} onClick={checkVault}>1. Vault を確認</button>
        <button disabled={busy} onClick={writeTest}>2. テストファイルを書き込む</button>
        <button disabled={busy} onClick={lockTest}>3. 競合検出を確認</button>
        <button disabled={busy} className="secondary" onClick={cleanupStray}>誤作成フォルダの片付け</button>
        <button
          className="secondary"
          onClick={() => {
            logout()
            onLogout()
          }}
        >
          ログアウト
        </button>
      </div>
      <p className="note">書き込み先: Vault/{DIARY_FOLDER}/ {TEST_NAMES.join(' / ')}</p>
      <ol className="logs">
        {logs.map((l, i) => (
          <li key={i} className={l.ok ? 'ok' : 'ng'}>
            {l.text}
          </li>
        ))}
      </ol>
    </section>
  )
}
