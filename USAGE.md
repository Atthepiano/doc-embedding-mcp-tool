# 使用说明

这份文档面向第一次接入 `doc-embedding-mcp-tool` 的使用者。

## 作用

这个 MCP 工具提供 3 个能力：

- `search_docs`：搜索知识库片段
- `get_document`：按路径读取文档全文
- `list_files`：列出当前知识库中的文件

它直接连接：

- Supabase
- Gemini Embedding API

它不负责：

- 文档索引构建
- Git webhook
- 自动同步文档仓库

## 前置条件

使用机器需要具备：

- Node.js 18+
- 能访问 Supabase
- 能访问 Gemini API

## 安装

如果你是从 GitHub 单独拉取这个仓库：

```bash
git clone <your-github-repo-url>
cd doc-embedding-mcp-tool
npm install
```

如果你拿到的是一个目录压缩包，也只需要进入目录后执行：

```bash
npm install
```

## 配置环境变量

先复制模板：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

然后填写 `.env`：

```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_key
DOC_EMBEDDING_MAX_SNIPPET_CHARS=800
DOC_EMBEDDING_DEFAULT_DOC_CHARS=12000
```

说明：

- `GEMINI_API_KEY`：用于生成查询向量
- `SUPABASE_URL`：你的 Supabase 项目地址
- `SUPABASE_KEY`：用于读取已索引文档数据
- `DOC_EMBEDDING_MAX_SNIPPET_CHARS`：搜索结果每条片段最大字符数
- `DOC_EMBEDDING_DEFAULT_DOC_CHARS`：读取全文时默认最大返回字符数

这个工具只读取：

- 当前目录下的 `.env`
- 当前进程环境变量

它不会再去读取外部项目的 `.env`。

## 本地启动

```bash
npm run mcp
```

启动后它会通过 `stdio` 等待 MCP 客户端连接，这是正常现象。

## 接入 Cursor

### 方案一：工作区内配置

如果你把这个仓库放在某个工作区目录内，可以在该工作区的 `.cursor/mcp.json` 中写：

```json
{
  "mcpServers": {
    "doc-embedding": {
      "type": "stdio",
      "command": "node",
      "args": ["D:/path/to/doc-embedding-mcp-tool/src/mcp-server.mjs"]
    }
  }
}
```

推荐直接使用绝对路径，这样不依赖 `${workspaceFolder}` 指向什么仓库。

### 方案二：Cursor 全局配置

如果你希望多个项目共用同一个 MCP 工具，也可以放到 Cursor 的全局 MCP 配置里，核心配置仍然是：

```json
{
  "type": "stdio",
  "command": "node",
  "args": ["D:/path/to/doc-embedding-mcp-tool/src/mcp-server.mjs"]
}
```

只要路径指向本仓库内的 `src/mcp-server.mjs` 即可。

## 工具用法

### `search_docs`

适合：

- 搜索某个概念
- 搜索某个需求相关文档
- 找到包含某个问题背景的片段

典型参数：

```json
{
  "query": "今晚吃啥",
  "topK": 5,
  "threshold": 0.5,
  "snippetChars": 800
}
```

### `get_document`

适合：

- 已经知道路径，想读取文档全文
- 搜索后想继续展开某个结果

典型参数：

```json
{
  "path": "docs/example.md",
  "maxChars": 12000
}
```

### `list_files`

适合：

- 看知识库当前都有哪些文件
- 辅助确认路径

典型参数：

```json
{
  "limit": 500
}
```

## 常见问题

### 1. 为什么启动后看起来“卡住了”？

因为它是 `stdio` MCP server，不是普通 CLI。启动后会等待 Cursor 或其他 MCP 客户端连接。

### 2. 为什么搜不到内容？

优先检查：

- Supabase 里是否已有索引数据
- `.env` 中 `SUPABASE_URL` 和 `SUPABASE_KEY` 是否正确
- `.env` 中 `GEMINI_API_KEY` 是否有效
- 当前机器是否能访问外网相关服务

### 3. 这个工具是否需要本地拉取文档仓库？

不需要。它只负责“查询已入库的数据”，不负责构建索引。

### 4. 这个工具是否依赖 `doc-embedding` 母仓？

不依赖。只要当前仓库目录完整、依赖安装完成、`.env` 正确，它就可以独立运行。
