# Doc Embedding MCP Tool

一个可独立分发的 MCP 查询工具。

它通过 `stdio` 暴露 3 个工具，直接连接 `Supabase + Gemini` 查询已经入库的文档知识库，不依赖外层项目路径，也不依赖 Web API。

## 它能做什么

- `search_docs`：搜索知识库片段
- `get_document`：按路径读取文档全文
- `list_files`：列出当前知识库文件

## 它不做什么

- 文档同步
- Git webhook
- 向量重建
- 文档仓库拉取

## 3 分钟接入 Cursor

### 1. 安装依赖

```bash
git clone https://github.com/Atthepiano/doc-embedding-mcp-tool.git
cd doc-embedding-mcp-tool
npm install
```

### 2. 配置 `.env`

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

最少需要填写：

```env
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
```

可选：

```env
DOC_EMBEDDING_MAX_SNIPPET_CHARS=800
DOC_EMBEDDING_DEFAULT_DOC_CHARS=12000
```

这个工具只读取：

- 当前目录下的 `.env`
- 当前进程环境变量

### 3. 在 Cursor 里接入

推荐在 Cursor 的 MCP 配置里直接写绝对路径，不要依赖 `${workspaceFolder}`：

```json
{
  "mcpServers": {
    "doc-embedding": {
      "type": "stdio",
      "command": "node",
      "args": ["D:/MCP/doc-embedding-mcp-tool/src/mcp-server.mjs"]
    }
  }
}
```

只要把路径改成你本机实际存放仓库的位置即可。

## 本地启动

```bash
npm run mcp
```

启动后进程会等待 MCP 客户端连接，这是正常现象。

## 常见用法

### 搜索知识库

示例参数：

```json
{
  "query": "今晚吃啥",
  "topK": 5,
  "threshold": 0.5,
  "snippetChars": 800
}
```

### 读取文档

示例参数：

```json
{
  "path": "docs/example.md",
  "maxChars": 12000
}
```

### 列出文件

示例参数：

```json
{
  "limit": 500
}
```

## 适用场景

- 给 Cursor、Claude Code、其他支持 MCP 的 AI IDE/CLI 做知识库检索
- 在多个项目之间复用同一套文档查询能力
- 让使用者只 clone 这个仓库，而不是整个 `doc-embedding` 母仓

## 详细文档

更完整的接入说明、参数说明和常见问题见：`USAGE.md`
