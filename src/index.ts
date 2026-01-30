#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@notionhq/client";
import dotenv from "dotenv";

// 環境変数読み込み
dotenv.config();

// Notion クライアント初期化
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

// セッション情報を保持（前回からの変更追跡用）
interface SessionData {
  lastLogTime: Date;
  sessionCount: number;
}

let sessionData: SessionData = {
  lastLogTime: new Date(),
  sessionCount: 0,
};

/**
 * Notionにセッションログを記録
 */
async function logSessionToNotion(params: {
  purpose: string;
  changes: string;
  errors?: string;
  learnings?: string;
  nextActions?: string;
  claudeComment?: string;
  codeQuality?: string;
}) {
  try {
    const now = new Date();
    sessionData.sessionCount++;

    // タイトル生成
    const title = `${now.toISOString().split("T")[0]} セッション#${sessionData.sessionCount}`;

    // Claudeのコメント生成（簡易版）
    const autoComment = generateClaudeComment({
      purpose: params.purpose,
      changes: params.changes,
      errors: params.errors,
    });

    // Notion Database に追加
    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        // タイトル（Name型）
        Name: {
          title: [
            {
              text: {
                content: title,
              },
            },
          ],
        },
        // 日時
        "日時": {
          date: {
            start: now.toISOString(),
          },
        },
        // 種別
        "種別": {
          select: {
            name: "セッション",
          },
        },
        // 変更目的
        "変更目的": {
          rich_text: [
            {
              text: {
                content: params.purpose,
              },
            },
          ],
        },
        // 変更内容
        "変更内容": {
          rich_text: [
            {
              text: {
                content: params.changes,
              },
            },
          ],
        },
        // エラー/課題
        ...(params.errors && {
          "エラー/課題": {
            rich_text: [
              {
                text: {
                  content: params.errors,
                },
              },
            ],
          },
        }),
        // 学習ポイント
        ...(params.learnings && {
          "学習ポイント": {
            rich_text: [
              {
                text: {
                  content: params.learnings,
                },
              },
            ],
          },
        }),
        // 次のアクション
        ...(params.nextActions && {
          "次のアクション": {
            rich_text: [
              {
                text: {
                  content: params.nextActions,
                },
              },
            ],
          },
        }),
        // Claudeコメント
        "Claudeコメント": {
          rich_text: [
            {
              text: {
                content: params.claudeComment || autoComment,
              },
            },
          ],
        },
        // コード品質
        ...(params.codeQuality && {
          "コード品質": {
            select: {
              name: params.codeQuality,
            },
          },
        }),
      },
    });

    // 前回のログ時刻を更新
    sessionData.lastLogTime = now;

    return {
      success: true,
      notionPageId: response.id,
      notionUrl: (response as any).url,
      title: title,
    };
  } catch (error: any) {
    console.error("Notion API Error:", error);
    throw new McpError(
      ErrorCode.InternalError,
      `Notionへの記録に失敗しました: ${error.message}`
    );
  }
}

/**
 * Claudeの自動コメント生成（簡易版）
 */
function generateClaudeComment(data: {
  purpose: string;
  changes: string;
  errors?: string;
}): string {
  const comments: string[] = [];

  // 目的の明確性チェック
  if (data.purpose.length > 50) {
    comments.push("✓ 変更目的が明確に記述されています");
  } else {
    comments.push("! 変更目的をもう少し詳しく記述すると、後から振り返りやすくなります");
  }

  // 変更内容の詳細度チェック
  if (data.changes.includes("ファイル") || data.changes.includes("関数")) {
    comments.push("✓ 具体的なファイルや関数名が記載されています");
  }

  // エラーハンドリングの有無
  if (data.errors && data.errors.length > 0) {
    comments.push("✓ エラーと解決方法が記録されています。将来の参考になります");
  }

  // 全体評価
  comments.push(
    "\n【第三者エンジニア視点】\n" +
      "記録の粒度は適切です。このペースで継続することで、開発の振り返りと学習が効率的に進みます。"
  );

  return comments.join("\n");
}

/**
 * MCPサーバーのセットアップ
 */
const server = new Server(
  {
    name: "notion-dev-logger",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール一覧の提供
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "log_session",
        description:
          "Claude Codeでの開発セッションをNotionに記録します。前回のログから今回までの変更内容、目的、学習内容などを記録できます。",
        inputSchema: {
          type: "object",
          properties: {
            purpose: {
              type: "string",
              description: "この変更の目的や背景（壁打ちで決まった内容など）",
            },
            changes: {
              type: "string",
              description:
                "変更内容の要約（変更したファイル、追加した機能など。コード全体を貼る必要はなく、概要を記載）",
            },
            errors: {
              type: "string",
              description: "遭遇したエラーや課題、その解決方法（オプション）",
            },
            learnings: {
              type: "string",
              description: "このセッションで学んだこと、気づき（オプション）",
            },
            nextActions: {
              type: "string",
              description: "次にやるべきこと、TODO（オプション）",
            },
            claudeComment: {
              type: "string",
              description:
                "Claudeからの具体的なコメント（省略時は自動生成）",
            },
            codeQuality: {
              type: "string",
              enum: ["A", "B", "C", "要改善"],
              description: "コード品質の評価（オプション）",
            },
          },
          required: ["purpose", "changes"],
        },
      },
    ],
  };
});

// ツール実行ハンドラ
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "log_session") {
    const args = request.params.arguments as any;

    const result = await logSessionToNotion({
      purpose: args.purpose,
      changes: args.changes,
      errors: args.errors,
      learnings: args.learnings,
      nextActions: args.nextActions,
      claudeComment: args.claudeComment,
      codeQuality: args.codeQuality,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              message: "開発セッションをNotionに記録しました！",
              ...result,
              sessionNumber: sessionData.sessionCount,
              timeSinceLastLog: `${Math.round(
                (new Date().getTime() - sessionData.lastLogTime.getTime()) /
                  60000
              )}分`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new McpError(
    ErrorCode.MethodNotFound,
    `Unknown tool: ${request.params.name}`
  );
});

// サーバー起動
async function main() {
  // 環境変数チェック
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
    console.error("Error: NOTION_API_KEY and NOTION_DATABASE_ID are required");
    console.error("Please check your .env file");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Notion Dev Logger MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});