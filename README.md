# Unity DROP v3

Unity DROPは、GitHub Pagesの演出フロントエンドとCloudflare Worker + Durable Objectの共有有限在庫APIで構成されています。抽選結果は必ずサーバーで確定・保存されてから演出へ渡されます。

## 運営：次回イベントの設定

イベントごとに編集するファイルは **`drop-config.json`だけ** です。

```json
{
  "eventId": 20261004,
  "totalDraws": 30,
  "inventory": {
    "secret": 1,
    "rare": 5,
    "common": 24
  }
}
```

1. `eventId`を未使用の数字へ変更します。
2. `totalDraws`を参加総数へ変更します。
3. 各レアリティの本数を変更します。3本数の合計は`totalDraws`と一致させます。
4. GitHubへ反映します。新しい`eventId`への最初の抽選時に、バックエンドが設定を検証してPoolのスナップショットを作成します。

開始済みPoolと同じ`eventId`の本数を後から書き換えるとAPIは`config_snapshot_mismatch`で停止します。途中在庫が別構成に変わることはありません。修正イベントを開始する場合は新しい`eventId`を使用してください。

## アーキテクチャ

```text
GitHub Pages（全員が同じURL）
  └─ POST /api/session → 署名済み匿名参加者トークン
  └─ POST /api/draw    → requestIdだけを送信
       └─ Cloudflare Worker（CORS・認証・設定取得）
            └─ eventId単位のDurable Object
                 └─ SQLite transactionSync
                      ├─ Pool残数を読み取り
                      ├─ サーバー乱数で残存在庫から抽選
                      ├─ 対象在庫と総残数を減算
                      ├─ Resultを保存
                      └─ Userを抽選済みとして一意保存
```

Durable Objectはイベントごとに1つ作成され、同一イベントの抽選を直列化します。SQLiteトランザクション内で確認・減算・結果保存を完結するため、同時アクセスでも在庫は負数になりません。`request_id`と`user_id`はどちらもUNIQUEであり、レスポンス消失後の再送やボタン連打でも同じ結果を返します。

ブラウザストレージは署名済み参加者トークン、再送用requestId、表示済み結果のキャッシュにのみ使用します。Pool・残数・当選結果の正本には使用しません。

## バックエンド選定

このリポジトリには従来、GitHub Pages以外のAPI、DB、認証、PWA、デプロイ設定はありませんでした。比較した候補のうちCloudflare Workers + Durable Objectsを採用しました。

| 候補 | Atomic処理 | GitHub Pages連携 | 運用負荷 | 採否 |
|---|---|---|---|---|
| Cloudflare Durable Objects | イベント単位の直列化 + SQLite transaction | REST/CORSで単純 | 設定ファイルを自動Snapshot | **採用** |
| Supabase/Postgres | RPC + row lockで可能 | SDK/REST | SQL migration、Auth、RLS管理が必要 | 不採用 |
| Firebase/Firestore | transaction retryで可能 | SDKで容易 | Auth/Rules/複数サービス設定 | 不採用 |
| Vercel Functions + DB | DB次第 | RESTで可能 | ホスティングとDBが増える | 不採用 |

小規模イベントで必要な「1イベント＝1つの調整単位」にDurable Objectが合致し、無料枠、強整合ストレージ、グローバルなWorkerエッジ、コードとして管理できる構成のバランスが最も良いためです。

## 初回セットアップ

1. CloudflareアカウントでWorkersを有効化します。
2. `worker/wrangler.toml`の`CONFIG_URL`を実際のブランチに合わせます。
3. 公開元を`ALLOWED_ORIGINS`へ設定します。
4. 推測困難な署名鍵を登録します。
   ```bash
   cd worker
   npx wrangler secret put SESSION_SECRET
   ```
5. Workerをデプロイします。
   ```bash
   npm install
   npm run deploy
   ```
6. 発行されたURLをルートの`app-config.js`へ設定し、GitHub Pagesをデプロイします。

`SESSION_SECRET`をGitへコミットしてはいけません。

## セキュリティ上の境界

参加者トークンはサーバー署名され、任意のuser IDをクライアントから指定できません。ただし、このサイトには既存の会員ログインがないため、ブラウザデータを完全に削除して新しい匿名セッションを作る行為まで「同一人物」と判定することはできません。人物単位の厳密な1回制限が必要な場合は、既存会員ID、会場受付コード、OAuthなどの本人性を持つ認証を追加してください。在庫総数と各レアリティ本数は、その場合でもサーバー側Poolにより常に保証されます。

## テスト

```bash
node --check script.js
node --check worker/src/index.js
node worker/test/config.test.mjs
```
