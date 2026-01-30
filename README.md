# Notion Dev Logger - MCP Server

Claude Codeでの開発セッションを自動的にNotionに記録するMCPサーバーです。

## 概要

このMCPサーバーは、Claude Code（Desktop版・CLI版）での開発作業を自動的にNotionデータベースに記録します。
開発の振り返り、学習の記録、プロジェクト管理に活用できます。

### 主な機能

- **セッション記録**: 開発セッションごとに変更内容、目的、学習内容を記録
- **自動コメント生成**: Claudeが第三者エンジニア視点でコードレビューコメントを生成
- **Notion連携**: 記録内容がNotionデータベースに自動保存
- **カレンダー統合**: Notionのカレンダービューで開発履歴を可視化

## 前提条件

以下がインストールされている必要があります：

- **Node.js**: v18以上（推奨：LTS版）
  - ダウンロード: https://nodejs.org/
- **Notion**: アカウントとワークスペース
- **Claude Code**: Desktop版またはCLI版

## セットアップ手順

### 1. Notion側の準備

#### 1-1. Notion Integrationの作成

1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「+ 新しいインテグレーション」をクリック
3. 以下を設定：
   - **名前**: `開発ログ記録Bot`（任意）
   - **ワークスペース**: 自分のワークスペースを選択
   - **種類**: Internal Integration
4. 「送信」をクリック
5. **Internal Integration Token** をコピーして保存（`secret_` で始まる文字列）

#### 1-2. Notionデータベースの作成

1. Notionで記録先のページを開く（例：`研究/環境構築/ProjectPage`）
2. `/database` と入力し、「インラインデータベース」を選択
3. データベース名を「開発ログ」に変更
4. 以下のプロパティを追加：

| プロパティ名 | 型 | 設定 |
|------------|-----|------|
| Name | Title | （デフォルト・変更不要） |
| 日時 | Date | 「時刻を含める」を有効化 |
| 種別 | Select | オプション：セッション, 日次, マイルストーン |
| 変更目的 | Text | - |
| 変更内容 | Text | - |
| エラー/課題 | Text | - |
| 学習ポイント | Text | - |
| 次のアクション | Text | - |
| Claudeコメント | Text | - |
| コード品質 | Select | オプション：A, B, C, 要改善 |

5. データベース右上の「...」→「接続」→ 作成した統合を選択
6. データベースのURLから**Database ID**を取得：
   ```
   https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=yyyyy
                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                        この部分がDatabase ID（32文字の英数字）
   ```

### 2. MCPサーバーのインストール

#### 2-1. リポジトリのクローン

```bash
# Windowsの場合
cd C:\Users\<ユーザー名>
mkdir mcp-servers
cd mcp-servers
git clone https://github.com/<あなたのユーザー名>/notion-dev-logger.git
cd notion-dev-logger

# WSL2/Linux/Macの場合
cd ~
mkdir mcp-servers
cd mcp-servers
git clone https://github.com/<あなたのユーザー名>/notion-dev-logger.git
cd notion-dev-logger
```

#### 2-2. 依存関係のインストール

```bash
npm install
```

#### 2-3. 環境変数の設定

`.env`ファイルを作成：

```bash
# Windowsの場合
notepad .env

# WSL2/Linux/Macの場合
nano .env
# または
vim .env
```

以下の内容を記述して保存：

```env
NOTION_API_KEY=secret_your_integration_token_here
NOTION_DATABASE_ID=your_database_id_here
```

**置き換える値：**
- `secret_your_integration_token_here`: ステップ1-1で取得したIntegration Token
- `your_database_id_here`: ステップ1-2で取得したDatabase ID

#### 2-4. ビルド

```bash
npm run build
```

成功すると `dist/index.js` が生成されます。

### 3. Claude Codeとの連携設定

#### 3-1. Claude Code Desktop版の場合

**Windowsの場合：**

設定ファイルの場所：
```
C:\Users\<ユーザー名>\AppData\Roaming\Claude\claude_desktop_config.json
```

**macOSの場合：**

設定ファイルの場所：
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**設定内容：**

```json
{
  "mcpServers": {
    "notion-dev-logger": {
      "command": "node",
      "args": [
        "C:\\Users\\<ユーザー名>\\mcp-servers\\notion-dev-logger\\dist\\index.js"
      ],
      "env": {
        "NOTION_API_KEY": "secret_your_integration_token_here",
        "NOTION_DATABASE_ID": "your_database_id_here"
      }
    }
  }
}
```

**注意点：**
- Windowsの場合、パスは `\\`（バックスラッシュ2つ）で区切る
- macOS/Linuxの場合、パスは `/Users/<ユーザー名>/mcp-servers/notion-dev-logger/dist/index.js`

#### 3-2. Claude Code CLI版の場合

**設定ファイルの場所：**

Windowsでも、CLI版は**WSL2内の設定**を使用します：

```bash
# WSL2内で実行
mkdir -p ~/.config/claude
nano ~/.config/claude/config.json
```

**設定内容：**

```json
{
  "mcpServers": {
    "notion-dev-logger": {
      "command": "node",
      "args": [
        "/mnt/c/Users/<ユーザー名>/mcp-servers/notion-dev-logger/dist/index.js"
      ],
      "env": {
        "NOTION_API_KEY": "secret_your_integration_token_here",
        "NOTION_DATABASE_ID": "your_database_id_here"
      }
    }
  }
}
```

**WSL2からWindowsのファイルにアクセスする場合：**
- Windowsの `C:\Users\student\...` は WSL2では `/mnt/c/Users/student/...` になります

**または、WSL2内にMCPサーバーを配置する場合：**

```bash
# WSL2内でクローン
cd ~
mkdir mcp-servers
cd mcp-servers
git clone https://github.com/<ユーザー名>/notion-dev-logger.git
cd notion-dev-logger
npm install
npm run build
```

設定ファイルのパスは：
```json
"args": [
  "/home/<WSLユーザー名>/mcp-servers/notion-dev-logger/dist/index.js"
]
```

### 4. 動作確認

#### 4-1. Claude Codeの再起動

- **Desktop版**: アプリを完全に終了して再起動
- **CLI版**: 新しいターミナルセッションを開始

#### 4-2. テスト

Claude Codeで以下のメッセージを送信：

```
利用可能なツールを教えて
```

`log_session` ツールが表示されればOKです。

#### 4-3. 実際の記録テスト

```
今日の作業をNotionに記録して。

目的：MCPサーバーのセットアップとテスト
変更内容：notion-dev-loggerをセットアップし、Notion連携を確認しました。
学習ポイント：MCPサーバーの仕組み、Notion API、環境構築の流れ
```

Notionの「開発ログ」データベースに新しいエントリーが作成されれば成功です！

## 使い方

### 基本的な記録

Claude Codeでの開発中、任意のタイミングで以下のように依頼：

```
ここまでの進捗をNotionに記録して

目的：〇〇機能の実装
変更内容：△△ファイルに××関数を追加、□□を修正
```

### より詳細な記録

```
セッションを記録して

目的：ユーザー認証機能の実装
変更内容：
- auth.tsにJWT検証ロジックを追加
- middleware/auth.tsを新規作成
- ルーティングに認証ミドルウェアを適用

エラー：JWT検証時にトークンの有効期限チェックでエラー
解決：expiresInオプションを正しく設定

学習ポイント：JWTの仕組み、ミドルウェアパターン

次のアクション：リフレッシュトークンの実装
```

### 記録される内容

- **日時**: 自動記録（カレンダー表示対応）
- **セッション番号**: 自動採番
- **変更目的**: あなたが指定
- **変更内容**: あなたが指定（網羅的だが簡潔に）
- **エラー/課題**: オプション
- **学習ポイント**: オプション
- **次のアクション**: オプション
- **Claudeコメント**: 自動生成（第三者エンジニア視点）
- **コード品質**: オプション（A/B/C/要改善）

## トラブルシューティング

### ツールが認識されない

1. 設定ファイルのパスが正しいか確認
2. `.env`ファイルが正しく作成されているか確認
3. `npm run build` が成功しているか確認
4. Claude Codeを完全に再起動

### Notion APIエラー

1. Integration TokenとDatabase IDが正しいか確認
2. NotionデータベースにIntegrationが接続されているか確認
3. データベースのプロパティ名が一致しているか確認（特に日本語）

### Node.jsが見つからない

```bash
# バージョン確認
node --version
npm --version

# パスの確認（Windows）
where node

# パスの確認（WSL2/Linux/Mac）
which node
```

### WSL2でWindowsのファイルにアクセスできない

WSL2からWindowsのファイルは `/mnt/c/...` でアクセスできます：

```bash
# 確認
ls /mnt/c/Users/<ユーザー名>/mcp-servers/notion-dev-logger
```

## 開発

### ローカルでの開発・テスト

```bash
# 開発モード（TypeScriptを直接実行）
npm run dev

# ビルド
npm run build

# 本番実行
npm start
```

### コードの構造

```
notion-dev-logger/
├── src/
│   └── index.ts          # メインロジック
├── dist/                 # ビルド出力（自動生成）
├── package.json          # プロジェクト設定
├── tsconfig.json         # TypeScript設定
├── .env                  # 環境変数（Gitには含めない）
├── .gitignore
└── README.md
```

## ライセンス

MIT

## 貢献

Issue、Pull Requestは大歓迎です！

## 今後の拡張予定

- [ ] 日次まとめ機能（1日の作業を統合）
- [ ] マイルストーン記録機能（週次レポート）
- [ ] Claudeコメントの精度向上
- [ ] コード品質スコアの自動算出
- [ ] 変更ファイルの自動検出（Git連携）
- [ ] 並行実行対応（記録中も開発継続可能）

## サポート

質問や問題があれば、Issueを作成してください。