# HTML モックについて

静的プロトタイプ（`*.html`）です。**本番の管理画面へは自動マウントされません。**

運用コード側では、

- `design/admin.html` の `<style>` → `apps/web/src/app/salon-design.css`（シェル・共通）
- `design/customers.html` / `design/reservations.html` のテーブル・ツールバー等 → `apps/web/src/app/design-pages.css`（画面パーツ）

を `globals.css` から読み込んでいます。HTML を更新したら、該当ブロックを上記 CSS に反映してください。
