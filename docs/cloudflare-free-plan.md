# Cloudflare 無料枠の調査

確認日：2026-11-02。金額は USD。公式情報の現時点の仕様で、将来の料金を保証するものではありません。

## このツールなら無料で始められるか

文字中心のアイデアを小さな研究室で蓄積する用途なら、Workers Free + D1 Free が有力です。現行の枠では十分に収まりやすいと見積もれます。まずこの構成を想定して実装しました。現在の実行先はローカルだけです。

| 項目 | 無料枠 |
| --- | --- |
| 静的 HTML / CSS / JS の配信 | 静的アセットのリクエストは無料・無制限 |
| Workers の動的リクエスト | 1 日 100,000 回、1 回の CPU 時間 10 ms |
| D1 行の読み取り | アカウント合計 1 日 5,000,000 行 |
| D1 行の書き込み | アカウント合計 1 日 100,000 行 |
| D1 DB 数 | アカウントあたり 10 個 |
| D1 容量 | 1 DB 最大 500 MB、アカウント合計 5 GB |
| D1 Time Travel（過去時点への復元） | 過去 7 日間 |

出典：[Workers 料金](https://developers.cloudflare.com/workers/platform/pricing/)、[D1 料金](https://developers.cloudflare.com/d1/platform/pricing/)、[D1 制限](https://developers.cloudflare.com/d1/platform/limits/)。無料枠はプロジェクトごとではなく、同じアカウントの利用量を合算するものがあります。静的アセットは Worker を先に実行しない構成で配信し、この試作では `/api/*` だけを Worker に通します。

## Supabase のように放置すると休止するか

Supabase Free は「1 週間非アクティブでプロジェクトを休止」と料金ページに明記しています。[Supabase 料金](https://supabase.com/pricing)

D1 は利用していないときに計算資源の料金が発生しない scale-to-zero のモデルです。Cloudflare の料金・制限・FAQ に Supabase と同様の「非アクティブ 7 日で手動復帰が必要な休止」という条件は記載されていません。そのため、定期的な訪問や keep-alive を前提にしない選択として合っています。これは公式仕様からの判断で、将来の方針や障害まで保証するという意味ではありません。[D1 料金](https://developers.cloudflare.com/d1/platform/pricing/)、[D1 FAQ](https://developers.cloudflare.com/d1/reference/faq/)

## 無料上限に達したら

D1 は日次の読み書き上限に達するとクエリがエラーになります。無料枠のまま自動的に有料超過分を請求する方式ではありません。日次枠のリセットは UTC 00:00、日本時間 09:00。容量の上限では不要データを削除するか、プラン変更が必要です。Workers のリクエスト上限も別に適用されます。[D1 料金 FAQ](https://developers.cloudflare.com/d1/platform/pricing/)、[Workers 制限](https://developers.cloudflare.com/workers/platform/limits/)

読み取りの単位は「API 呼び出し回数」ではなく「スキャンされた行数」です。例えば 1,000 件を全件取得すると約 1,000 行の読み取りになります。インデックス更新も書き込み数を増やします。試作は一度取得したデータを画面内で検索するため、キーボード入力のたびに DB を読みに行きません。[D1 料金の定義](https://developers.cloudflare.com/d1/platform/pricing/)

例として、20 人が毎日 10 回、1,000 件の全件取得を行うと、読み取りは約 200,000 行 / 日。20 人が 10 件ずつ保存しても 200 レコードの更新 / 日です。索引等の追加分を考えても無料枠に余裕がある計算ですが、他のアプリとの合算や実際のクエリで変わります。1 件 5 KB のテキストを 10,000 件なら本文だけで約 50 MB、別に索引等の容量が必要です。これらは公式枠を基にした概算です。

## 追加機能の扱い

- PDF や画像の添付は DB に詰めず R2 等へ保存する構成が適しています。R2 Standard の無料枠は 10 GB-month、Class A 100 万回 / 月、Class B 1,000 万回 / 月、インターネット転送は無料です。R2 有効化時の課金設定は別途確認します。[R2 料金](https://developers.cloudflare.com/r2/pricing/)
- D1 自体には Supabase Auth 相当の利用者認証や Realtime がありません。この試作は共通キーで API を保護しており、個人認証や自動同期は別の実装です。
- AI によるタグ生成・要約・関係推定の利用料金は、この Workers / D1 枠だけでは判断できません。この試作はタグと手動関連で線を表示し、AI API を呼びません。
- Time Travel の 7 日間はバックアップの復元範囲です。「7 日間放置すると停止」とは別の話です。長期保管したいバックアップは別に書き出します。

Workers Paid は月 $5 からですが、自動で切り替える必要はありません。まず無料で利用量を確認し、上限・必要機能が見えた時点で判断できます。[Workers 料金](https://developers.cloudflare.com/workers/platform/pricing/)
