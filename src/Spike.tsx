import { useState } from 'react'
import { DIARY_FOLDER, VAULT_ROOT } from './config'
import { DropboxError, downloadText, getMetadata, listFolder, upload } from './dropbox/api'
import { logout } from './dropbox/auth'

type Log = { ok: boolean; text: string }

const TEST_FILES = [`${VAULT_ROOT}/${DIARY_FOLDER}/dairys-test.md`, `${VAULT_ROOT}/${DIARY_FOLDER}/dairys-テスト.md`]

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
      const root = await listFolder(VAULT_ROOT)
      push(true, `${VAULT_ROOT}: ${root.length}件 (${root.map((e) => e.name).slice(0, 12).join(', ')})`)
      const diary = await listFolder(`${VAULT_ROOT}/${DIARY_FOLDER}`)
      push(true, `${DIARY_FOLDER}: ${diary.filter((e) => e['.tag'] === 'file').length}ファイル`)
      const people = await listFolder(`${VAULT_ROOT}/30_HumanNetwork/10_People`)
      push(true, `10_People: ${people.length}件 / 40_Places は後で取得`)
      const latest = diary.filter((e) => e['.tag'] === 'file').sort((a, b) => b.name.localeCompare(a.name))[0]
      if (latest) {
        const text = await downloadText(latest.path_display)
        push(true, `最新の日記 ${latest.name} を読み取り: ${text.length}文字`)
      }
    })

  const writeTest = () =>
    run('書き込みと読み戻し', async () => {
      for (const path of TEST_FILES) {
        const content = testContent('書き込み')
        const entry = await upload(path, content, { kind: 'overwrite' })
        const back = await downloadText(path)
        push(back === content, `${entry.name} rev=${entry.rev} 読み戻し${back === content ? '一致' : '不一致'}`)
      }
    })

  const lockTest = () =>
    run('楽観ロック（rev 指定の更新）', async () => {
      const path = TEST_FILES[0]
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

  return (
    <section className="spike">
      <h2>技術検証（Step 1）</h2>
      <div className="buttons">
        <button disabled={busy} onClick={checkVault}>1. Vault を確認</button>
        <button disabled={busy} onClick={writeTest}>2. テストファイルを書き込む</button>
        <button disabled={busy} onClick={lockTest}>3. 競合検出を確認</button>
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
      <p className="note">書き込み先: {TEST_FILES.map((p) => p.replace(VAULT_ROOT + '/', '')).join(' / ')}</p>
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
