# Doc Embedding MCP Tool

这是 `doc-embedding` 项目下独立孵化的 MCP 查询工具子仓库形态。
它现在已经收敛为“自包含运行”模式，不再依赖外层项目路径或外层 `.env`。

详细接入步骤见：`USAGE.md`

它只负责：

- `search_docs`
- `get_document`
- `list_files`

它不负责：

- 文档同步
- GitLab webhook
- 向量库重建

## 目录定位

当前放在主项目目录下：

```text
doc-embedding/
└─ mcp-tool/
```

但它的目标是可被单独拿走、单独维护、单独分发。

## 安装

```bash
cd mcp-tool
npm install
```

## 配置

只会读取两类配置来源：

1. `mcp-tool/.env`
2. 当前进程环境变量

最少需要：

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

建议先复制模板：

```bash
cp .env.example .env
```

如果在 Windows PowerShell 中，可直接：

```powershell
Copy-Item .env.example .env
```

## 启动

```bash
npm run mcp
```

## Cursor 配置示例

如果把它作为当前项目下的子仓库使用，可在 `.cursor/mcp.json` 里配置：

```json
{
  "mcpServers": {
    "doc-embedding": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/mcp-tool/src/mcp-server.mjs"]
    }
  }
}
```

如果以后它被单独放到其他目录，推荐改成全局 MCP 配置并使用绝对路径。

## 独立分发说明

把整个 `mcp-tool/` 目录单独拿出去也是可以工作的，前提只有两个：

1. 先执行 `npm install`
2. 在当前目录准备好 `.env`

它不要求：

- 保留外层 `doc-embedding/`
- 保留 `web/`
- 使用 `${workspaceFolder}` 指向母仓
