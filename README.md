# Pale Hour 公式サイト

恋愛コンサルティングブランド「Pale Hour」の公式ホームページ。
静的なHTML/CSS/JSのみで構成（外部ライブラリなし。フォントのみGoogle Fonts）。

## ローカル確認方法

`file://` で直接開くとフォルダ形式のリンク（`about/` など）が正しく動かないため、簡易サーバーで確認する。

```
cd Pale_Hour_LP\site
python -m http.server 8000
```

→ ブラウザで http://localhost:8000 を開く。

## 各ページの役割

| パス | 役割 |
|---|---|
| `/` | Home。夜→夜明けへ変化する空の演出（確定演出・変更しない） |
| `/about/` | ブランドの思想・ストーリー・Values・運営者紹介 |
| `/program/` | 提供プログラムとファネル全体（成長プロセスとして表現） |
| `/voice/` | お客様の声（現在は掲載準備中。実在の声のみ掲載する） |
| `/journal/` | 記事一覧（静的） |
| `/journal/article-template/` | 記事詳細テンプレート。新記事はフォルダごと複製して作る |
| `/faq/` | よくある質問（アコーディオン） |
| `/contact/` | お問い合わせフォーム（見た目とバリデーションのみ・送信未接続） |
| `/privacy/` | プライバシーポリシー |
| `/legal/` | 特定商取引法に基づく表記 |
| `/diagnosis/` | 既存の恋愛フェーズ診断LP（従来の index.html をそのまま移設） |

共通CSS: `assets/css/common.css`（トークン/ヘッダー/フッター/ボタン/フォーム）
Home専用: `assets/css/home.css` + `assets/js/home.js`（空の演出）
下層共通: `assets/css/pages.css` / `assets/js/common.js`

## 画像差し替え場所

`assets/images/` 配下。同じ朝・同じ海辺のトーンで統一すること（文字焼き込み禁止）。

| ファイル | 使用箇所 | 推奨比率 |
|---|---|---|
| `hero/hero-dawn.jpg` | Home Hero・OGP | 16:9（横長） |
| `common/woman-shore.jpg` | About Brand Story | 4:5（縦・人物は後ろ姿） |
| `common/sea-calm.jpg` | Program CTA帯 | 16:9 |
| `common/sea-mist.jpg` | Voice CTA帯 | 16:9 |
| `common/sea-sunrise.jpg` | About/FAQ CTA帯 | 4:3 |
| `common/night-bedside.jpg` | 注目記事サムネ・記事ヒーロー・記事OGP（返信が来ない夜） | 3:2 |
| `common/beach-walk.jpg` | Journalサムネ（Love） | 4:5（縦） |
| `common/morning-curtain.jpg` | Journalサムネ（Self） | 4:5（縦） |
| `common/white-flower.jpg` | Journalサムネ（Life） | 4:5（縦） |
| `common/desk-sunrise.jpg` | Journalサムネ（Career） | 3:2 |
| `common/morning-mug.jpg` | Home Concept | 4:5（縦） |
| `common/night-sea-moon.jpg` | About写真帯・Journal CTA帯 | 16:9 |
| `common/linen-texture.jpg` | Home FAQ/Contact背景 | 16:9 |
| `concept/still-morning.jpg` | （現在未使用・予備） | 4:5（縦） |

※ 2026-07-11追加の8枚（night-bedside〜linen-texture）は生成画像。元PNG＝`Pale_Hour_LP\ChatGPT Image 2026年7月11日 *.png`。

※ `/diagnosis/` 内のjpg（Hero_firstview.jpg等）はLP専用。LPは相対パスで参照しているため削除しない。

**ファビコン（タブアイコン）**：`assets/images/common/` の `favicon.svg`（メイン）／`favicon-32.png`（フォールバック）／`apple-touch-icon.png`（iOS）／`icon-512.png`（予備・PWA等）。デザイン＝Deep Indigo角丸タイル×Pale Blue細線の「水平線と昇る光」。全ページ＋診断LPの`<head>`に設定済み。変更時は3ファイルとも作り直す。

## SNSリンク差し替え場所

各ページのフッター `Follow` 列。すべて設定済み：
- Instagram: https://www.instagram.com/shiromomo_renai_mind/
- Threads: https://www.threads.com/@shiromomo_renai_mind
- Note: https://note.com/shirmo_milan
- LINE: 下記

## LINEリンク

公式LINE: `https://lin.ee/Tr6jRUn`（`data-cv="line"` 付きリンクはGA4でクリック計測される）

## 問い合わせフォームの接続方法

`/contact/index.html` のフォームは現在 **送信未接続**（バリデーションのみ。送信完了とは表示しない）。

接続手順（どちらか）:
1. **Formspree**: `<form id="contactForm">` に `action="https://formspree.io/f/【フォームID】" method="POST"` を追加し、`assets/js/common.js` の `contactForm` 処理を「バリデーション通過時に `form.submit()`」へ変更。
2. **Googleフォーム**: 診断LPと同じ `formResponse` + `entry.番号` 方式（`Pale_Hour_LP/セットアップ手順.md` 参照）。

検索用コメント: `TODO: 本番公開前にフォーム送信先を接続する`

## OGP画像の設定場所

各ページ `<head>` の `og:image`。現在は `hero-dawn.jpg` の絶対URL。
独自ドメイン（pale-hour.com）へ切替時は、全ページの `og:url` / `og:image` / `<link rel="canonical">` のドメインを一括置換する。

## Privacyと特商法の差し替え箇所

- `/privacy/index.html` … `.legal-doc` 内
- `/legal/index.html` … `.legal-doc` 内の `<dl>`
- 同じ内容が **診断LP（/diagnosis/index.html）内のダイアログ** にもあるため、変更時は両方更新する。

## 診断LPへのリンク

サイト内の主要CTAはすべて `diagnosis/`（相対パス）へ接続済み。
診断結果のフェーズ名は5段階に統一済み: **Midnight / First Light / Turning Tide / Sunrise / Morning Tide**（旧「Blue Hour」は使用しない）。

## 公開前チェック項目

- [ ] 全ページのリンクが動く（ローカルサーバーで確認）
- [ ] ナビの現在地表示（下線）が正しい
- [ ] 診断CTA→ `/diagnosis/` が動き、診断→LINE登録まで通る
- [ ] 公式LINEリンクが正しい
- [ ] スマホ（375px）で横スクロールが出ない
- [ ] ハンバーガーメニューが開閉できる（Escapeキーでも閉じる）
- [ ] FAQのアコーディオンが開閉できる
- [ ] フォームが「送信完了」と誤表示しない（接続後に文言を差し替え）
- [ ] Voice・運営者紹介に架空の内容が入っていない
- [ ] フッターSNSリンク4つ（IG/Threads/Note/LINE）が正しいプロフィールへ飛ぶ
- [ ] 独自ドメイン切替時: canonical / og:url / og:image を一括置換
