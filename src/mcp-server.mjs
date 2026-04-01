import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadEnvFiles } from "./env.mjs";
import {
  getDocumentByPath,
  listFilePaths,
  searchDocuments,
} from "./retrieval.mjs";

const DEFAULT_SNIPPET_CHARS = 800;
const DEFAULT_DOCUMENT_CHARS = 12_000;

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function truncate(text, maxChars) {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }

  return {
    text: `${text.slice(0, maxChars)}\n\n[已截断，原文更长]`,
    truncated: true,
  };
}

export function createServer() {
  const defaultSnippetChars = parsePositiveNumber(
    process.env.DOC_EMBEDDING_MAX_SNIPPET_CHARS,
    DEFAULT_SNIPPET_CHARS
  );
  const defaultDocumentChars = parsePositiveNumber(
    process.env.DOC_EMBEDDING_DEFAULT_DOC_CHARS,
    DEFAULT_DOCUMENT_CHARS
  );

  const server = new McpServer({
    name: "doc-embedding-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "search_docs",
    {
      title: "搜索知识库",
      description:
        "检索项目知识库，返回最相关的文档片段、文件路径和相似度。默认只返回精简片段，减少上下文占用。",
      inputSchema: {
        query: z.string().min(1).describe("自然语言查询"),
        topK: z.number().int().min(1).max(20).default(5).describe("返回条数"),
        threshold: z
          .number()
          .min(0)
          .max(1)
          .default(0.5)
          .describe("最小相似度阈值"),
        snippetChars: z
          .number()
          .int()
          .min(100)
          .max(4000)
          .default(defaultSnippetChars)
          .describe("每条结果保留的最大字符数"),
      },
    },
    async ({
      query,
      topK = 5,
      threshold = 0.5,
      snippetChars = defaultSnippetChars,
    }) => {
      const results = await searchDocuments({ query, topK, threshold });

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `未检索到结果。\nquery: ${query}\nmode: direct-supabase`,
            },
          ],
          structuredContent: {
            query,
            mode: "direct-supabase",
            results: [],
          },
        };
      }

      const compactResults = results.map((item, index) => {
        const snippet = truncate(String(item.content ?? ""), snippetChars);
        return {
          rank: index + 1,
          id: item.id,
          file_path: item.file_path,
          similarity: item.similarity,
          content: snippet.text,
          truncated: snippet.truncated,
        };
      });

      const summary = compactResults
        .map(
          (item) =>
            `#${item.rank} ${item.file_path} (similarity: ${Number(item.similarity).toFixed(4)})\n${item.content}`
        )
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `query: ${query}\nmode: direct-supabase\n\n${summary}`,
          },
        ],
        structuredContent: {
          query,
          mode: "direct-supabase",
          results: compactResults,
        },
      };
    }
  );

  server.registerTool(
    "get_document",
    {
      title: "读取文档全文",
      description:
        "按文件路径读取已入库文档。默认会截断长文，避免一次塞进过多上下文。",
      inputSchema: {
        path: z.string().min(1).describe("文档 file_path"),
        maxChars: z
          .number()
          .int()
          .min(500)
          .max(100000)
          .default(defaultDocumentChars)
          .describe("返回的最大字符数"),
      },
    },
    async ({ path, maxChars = defaultDocumentChars }) => {
      const document = await getDocumentByPath(path);

      if (!document || typeof document.content !== "string") {
        throw new Error("文档不存在或响应格式不正确");
      }

      const trimmed = truncate(document.content, maxChars);

      return {
        content: [
          {
            type: "text",
            text: `path: ${document.file_path}\nmode: direct-supabase\ntruncated: ${trimmed.truncated}\n\n${trimmed.text}`,
          },
        ],
        structuredContent: {
          path: document.file_path,
          mode: "direct-supabase",
          truncated: trimmed.truncated,
          content: trimmed.text,
        },
      };
    }
  );

  server.registerTool(
    "list_files",
    {
      title: "列出知识库文件",
      description: "列出当前知识库中的文件路径列表。",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(5000)
          .default(500)
          .describe("最多返回多少条文件路径"),
      },
    },
    async ({ limit = 500 }) => {
      const filePaths = (await listFilePaths()).slice(0, limit);

      return {
        content: [
          {
            type: "text",
            text: filePaths.length
              ? `mode: direct-supabase\ncount: ${filePaths.length}\n\n${filePaths.join("\n")}`
              : "知识库中暂无文件。\nmode: direct-supabase",
          },
        ],
        structuredContent: {
          mode: "direct-supabase",
          count: filePaths.length,
          files: filePaths,
        },
      };
    }
  );

  return server;
}

export async function main() {
  loadEnvFiles();
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(
    "[doc-embedding-mcp] connected in direct-supabase mode\n"
  );
}

const isMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main().catch((error) => {
    process.stderr.write(
      `[doc-embedding-mcp] failed: ${error instanceof Error ? error.stack || error.message : String(error)}\n`
    );
    process.exit(1);
  });
}
