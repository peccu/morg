# Lessons & Learnings

> このファイルは毎セッション自動ロードされます。
> **タスク着手前に必ずこのリストを確認し、同じ失敗を繰り返さないようにしてください。**
> 追加・更新は `/task` スキルで行います。

---

## L001 · vue-tscテンプレートでglobalオブジェクトを直接参照できない

**発生**: コピーボタン実装時に `navigator.clipboard.writeText()` をテンプレートに直書きしたところ型エラー

**症状**
```
error TS2339: Property 'navigator' does not exist on type 'CreateComponentPublicInstance...'
```

**対策**: テンプレートから `window.*` / `navigator.*` / `document.*` を直接呼ばない。
スクリプトセクションにラッパー関数を作る:
```ts
function copyText(text: string) {
  navigator.clipboard.writeText(text)
}
```

---

## L002 · overflow-x-auto コンテナは絶対配置の子要素をクリップする

**発生**: BulkActionBarのラベルドロップダウンが `overflow-x-auto` の親コンテナに隠れた

**症状**: ドロップダウンが表示されない・z-indexを上げても効果なし

**対策**: ドロップダウンを `overflow-x-auto` コンテナの**外側**に置く。
Teleport to body か、スクロール不要な行（row1など）に移動する。

---

## L003 · Vitestモックで `{ value: false }` はテンプレートでtruthyになる

**発生**: BulkActionBarテストで `isProcessing: { value: false }` とモックしたら
ボタンが disabled になった

**症状**: テストが意図と逆の結果になる

**対策**: `ref` をインポートして `isProcessing: ref(false)` で返す:
```ts
import { ref } from 'vue'
vi.mock('@/composables/useBulkAction', () => ({
  useBulkAction: () => ({ isProcessing: ref(false), ... })
}))
```

---

## L004 · Vitestのモック呼び出し回数はテスト間で累積する

**発生**: `expect(mockFn).toHaveBeenCalledTimes(3)` が6回と言われた

**症状**: 後続テストで前テストの呼び出し回数が残っている

**対策**: `beforeEach` で `vi.restoreAllMocks()` ではなく **`vi.clearAllMocks()`** を使う。
`restoreAllMocks` はスパイを元に戻すが呼び出し回数はクリアしない場合がある。

---

## L005 · iOS Safariで overflow-x:auto が子の overflow:visible を無視する

**発生**: メール本文の横スクロールがiOSで動かなかった

**症状**: 親に `overflow-x: auto` を置いても子のオーバーフロー幅を検知しない

**対策**: スクロール対象コンテナを「直接の子要素がはみ出す要素」に設定する。
外側ラッパーに `overflow-x: auto` を置くのではなく、`.mail-body.mail-scroll` 自身に付与する。

---

## L006 · テストが通らない状態でpushしてCIが失敗した

**発生**: コード変更後にテスト・型チェックを実行せずpushし、CIで失敗して無駄な待ち時間が発生した

**症状**: GitHub Actions の CI が失敗してからエラーに気づく

**対策**: **pushの直前に必ず functions と web 両方のテストと型チェックを実行する**:
```bash
bun run --cwd packages/functions test --run && bun run --cwd apps/web test --run && bun run --cwd apps/web typecheck
```
両方通過してからpushする。失敗していたらpushしない。

---

## L007 · vitest でモック対象モジュールに新しいエクスポートを追加したらモックも更新が必要

**発生**: T003で `InvalidGrantError` を `token.ts` に追加したが、functions テストの `vi.mock('../src/lib/token', ...)` に含めなかったためCIが失敗した

**症状**:
```
Error: [vitest] No "InvalidGrantError" export is defined on the "../src/lib/token" mock.
```

**対策**: モック対象モジュールにエクスポートを追加したら、そのモジュールをモックしているテストファイルを `grep` で洗い出して全て更新する:
```bash
grep -rn "mock.*lib/token" packages/functions/tests/
```
クラスのモックは以下のように書く:
```ts
InvalidGrantError: class InvalidGrantError extends Error {
  constructor() { super('invalid_grant') }
},
```
