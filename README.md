# Unity DROP v3

Unity DROPは、GitHub Pagesの演出フロントエンドとCloudflare Worker + Durable Objectの共有有限在庫APIで構成されています。抽選結果は必ずサーバーで確定・保存されてから演出へ渡されます。

## 運営：抽選設定を即時変更

Unity Analyticsの設定 → Unity DROP 抽選設定から、母数・レア・シークレットレアの総本数を変更できる。通常枠は差引き。管理者による確認保存で、当日の未抽選在庫へ即時反映し、翌日以降の既定値も更新する。

抽選済みの当選結果と1人1回（匿名ブラウザセッション単位）の制限は維持する。各レアリティの総本数を既に当選した本数より少なくする変更は409で拒否する。使い切った在庫の増枠も同じ仕組みで行える。リセットや既存当選の削除はしない。

初回の管理保存前だけ、drop-config.jsonが初期既定値になる。保存後の正本は新しいDropSettings Durable Object。従来EventPoolの名前・SQL・drawsを引き継ぎ、managed_configテーブルを追加して既存の結果を保持する。保存後にGitHubの初期値を編集しても管理設定は上書きされない。

### 接続設定

専用の推測困難な32文字以上の `DROP_ADMIN_TOKEN` をCloudflare WorkerとAnalyticsのVercel環境に同じ値で設定する。既存SESSION_SECRET/CRON_SECRETは流用・変更しない。Workerは `npx wrangler secret put DROP_ADMIN_TOKEN`、AnalyticsはVercel Productionの環境変数へ追加して再デプロイする。キーをGitやチャットへ貼らない。設定未完了でも通常抽選は従来値で動作し、Analyticsの編集は無効になる。

`GET/POST /api/admin/config` は専用Bearer認証必須、JSON2KiB以内。公開/api/eventは互換フィールドにinventory、configVersion=3、adminConfiguredを追加する。管理APIからの更新はrevisionとeventIdを比較し、他の編集やJST日付変更との競合を409で返す。

DropSettingsは設定更新とdrawを直列化する。更新は永続pending journal→EventPool内のSQLite transaction→既定値とrevisionの原子的保存の順。途中で切れても同じoperationIdの再適用により復旧し、引いた結果や在庫を二重に変更しない。更新結果不明の場合は再保存せず最新状態を取得する。

既存EVENT_POOLSは維持し、新しいDROP_SETTINGS bindingとv2-drop-settings migrationを追加する。どちらもSQLite Durable Objects。初回導入で既存の抽選本数は変更しない。draw APIを本番Smoke testとして実行しない。

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
node test/presentation.test.cjs
node --check worker/src/index.js
node worker/test/config.test.mjs
node worker/test/settings.test.mjs
```

## ランダム動画演出

既存3本のレアリティ対応は維持し、当選レアリティに対応する既存1本と共通の追加5本の計6本から、毎回等確率で1本を選んで再生します。追加5本はすべてのレアリティで共通です。画面に表示される景品は抽選APIが確定した結果です。動画の選択は当選確率・在庫・抽選回数制限に影響しません。

## 当選画像の保存

結果画面と受け取り済み画面の「画像を保存」で、景品・レアリティ・有効期限を含む1080×1350のPNGをダウンロードできます。対応するiPhone／iPadでは画像ファイルの共有メニューを開き、「画像を保存」で写真ライブラリに保存できます。Webサイトから無確認で直接写真ライブラリに書き込むことはできません。共有非対応のブラウザや共有エラー時はPNGダウンロードに切り替えます。共有メニューのキャンセル時は保存しません。

画像保存のブラウザテスト（Python Playwright、Pillow、Chromiumとローカルフロントエンドが必要）：

```bash
python3 test/save-image.test.py
python3 test/ios-save-image.test.py
```
