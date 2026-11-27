import { useState } from 'react'
import { Glyph, TileIcon } from '../ui/Icon'
import { reloadDirectory } from '../vault/directory'
import { planMaintenance, runMaintenance, type MaintenanceItem, type MaintenanceTarget } from '../vault/notes'
import { RELATIONS } from '../vault/person'

type Phase =
  | { kind: 'idle' }
  | { kind: 'checking'; done: number; total: number }
  | { kind: 'planned'; items: MaintenanceItem[] }
  | { kind: 'running'; items: MaintenanceItem[]; done: number; total: number }
  | { kind: 'done'; changed: number; failed: string[] }
  | { kind: 'error'; message: string }

const META: Record<MaintenanceTarget, { title: string; text: string }> = {
  people: { title: '人物ノート', text: '「最近の接点」の表をアプリの日記も出る形に直し、間柄が空の人には下書きを入れます。人物のテンプレートも新しい項目にします。' },
  places: { title: '場所ノート', text: '「訪問履歴」の表をアプリの日記も出る形に直します。場所のテンプレートの表も直します。' },
}

function Task({ target }: { target: MaintenanceTarget }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [showNames, setShowNames] = useState(false)

  const check = async () => {
    setPhase({ kind: 'checking', done: 0, total: 0 })
    try {
      const items = await planMaintenance(target, (done, total) => setPhase({ kind: 'checking', done, total }))
      setPhase({ kind: 'planned', items })
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  const run = async (items: MaintenanceItem[]) => {
    setPhase({ kind: 'running', items, done: 0, total: items.length })
    try {
      const result = await runMaintenance(target, items, (done, total) => setPhase({ kind: 'running', items, done, total }))
      setPhase({ kind: 'done', ...result })
      void reloadDirectory()
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  const items = phase.kind === 'planned' || phase.kind === 'running' ? phase.items : []
  const upgrades = items.filter((i) => i.upgrade && !i.template).length
  const templates = items.filter((i) => i.template).length
  const drafts = items.filter((i) => i.relation)

  return (
    <section className="card stack">
      <span className="ribbon">{META[target].title}</span>
      <p className="small">{META[target].text}</p>

      {phase.kind === 'checking' && <p className="muted small">確認しています（{phase.done} / {phase.total}）</p>}

      {(phase.kind === 'planned' || phase.kind === 'running') &&
        (items.length === 0 ? (
          <p className="muted">直すノートはありません。</p>
        ) : (
          <div className="stack tight">
            <div className="list-row">
              <span className="tag mint">表を直す</span>
              <span className="value">{upgrades}件</span>
            </div>
            {target === 'people' && (
              <div className="list-row">
                <span className="tag mint">間柄の下書き</span>
                <span className="value">{drafts.length}人</span>
              </div>
            )}
            {templates > 0 && (
              <div className="list-row">
                <span className="tag mint">テンプレート</span>
                <span className="value">{templates}件</span>
              </div>
            )}
            {drafts.length > 0 && (
              <>
                <button className="chip-add" onClick={() => setShowNames(!showNames)}>
                  <Glyph name={showNames ? 'chevronDown' : 'chevronRight'} size={14} />
                  下書きの内容を{showNames ? '閉じる' : '見る'}
                </button>
                {showNames &&
                  RELATIONS.map((r) => {
                    const names = drafts.filter((d) => d.relation === r).map((d) => d.name)
                    return names.length > 0 ? (
                      <p key={r} className="small">
                        <span className="tag cream">{r}</span> {names.join('、')}
                      </p>
                    ) : null
                  })}
              </>
            )}
          </div>
        ))}

      {phase.kind === 'done' && (
        <div className="stack tight">
          <p>{phase.changed}件のノートを書き換えました。</p>
          {target === 'people' && <p className="small muted">間柄は「人物・場所」の一覧で確認し、違っていたら人物の画面で直してください。</p>}
          {phase.failed.length > 0 && <p className="error">書き換えられなかったノート: {phase.failed.join('、')}</p>}
        </div>
      )}
      {phase.kind === 'error' && <p className="error">{phase.message}</p>}

      {phase.kind === 'planned' && items.length > 0 ? (
        <button className="btn primary" onClick={() => run(items)}>
          <Glyph name="check" />
          {items.length}件を書き換える
        </button>
      ) : phase.kind === 'running' ? (
        <button className="btn primary" disabled>
          書き換えています（{phase.done} / {phase.total}）
        </button>
      ) : (
        <button className="btn secondary" disabled={phase.kind === 'checking'} onClick={check}>
          <Glyph name="search" />
          確認する
        </button>
      )}
    </section>
  )
}

export default function Maintenance() {
  return (
    <div className="stack">
      <div className="notice">
        <TileIcon name="clipboard" size={36} />
        <div className="grow stack tight">
          <p>人物と場所は分けて実行してください</p>
          <p className="small muted">片方を書き換えたら、PC と iPhone の Obsidian で一度同期してから、もう片方を実行します。変更が全ファイルの半分を超えると、Remotely Save が安全のため同期を止めるためです。</p>
        </div>
      </div>
      <Task target="people" />
      <Task target="places" />
    </div>
  )
}
