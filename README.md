# PTT Stock MCP Server

這是一個 MCP (Model Context Protocol) 伺服器，專門用於擷取 PTT Stock 版的文章和推文資料，並提供摘要功能。

## 功能特色

- 擷取 PTT Stock 版過去 24 小時的文章列表
- 取得文章詳細內容包含所有推文
- 智能摘要文章內容和推文觀點
- 支援推文情緒分析和熱門度計算

## 安裝步驟

1. 克隆或下載專案檔案
2. 安裝依賴套件：
```bash
npm install
```

3. 編譯 TypeScript（如果需要）：
```bash
npm run build
```

4. 啟動伺服器：
```bash
npm start
```

## 可用工具

### 1. get_stock_posts_24h
取得 PTT Stock 版過去 24 小時的文章列表

**參數：**
- `limit` (可選): 限制返回文章數量，預設 50

**範例：**
```json
{
  "limit": 30
}
```

### 2. get_post_detail
取得特定文章的詳細內容包含推文

**參數：**
- `url` (必需): 文章的完整 URL

**範例：**
```json
{
  "url": "https://www.ptt.cc/bbs/Stock/M.1234567890.A.123.html"
}
```

### 3. summarize_posts
摘要指定文章的內容和推文

**參數：**
- `posts` (必需): 要摘要的文章列表
- `summaryType` (可選): 摘要類型，"brief" 或 "detailed"，預設 "brief"

**範例：**
```json
{
  "posts": [
    {
      "title": "文章標題",
      "url": "https://www.ptt.cc/bbs/Stock/M.1234567890.A.123.html"
    }
  ],
  "summaryType": "detailed"
}
```

## 使用方式

### 在 Claude Desktop 中使用

1. 編輯 Claude Desktop 的配置文件：
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. 添加 MCP 伺服器配置：
```json
{
  "mcpServers": {
    "ptt-stock": {
      "command": "node",
      "args": ["/path/to/your/ptt-stock-mcp-server/index.js"]
    }
  }
}
```

3. 重啟 Claude Desktop

### 指令範例

- "幫我取得 PTT Stock 版最新 20 篇文章"
- "分析這篇文章的推文反應"  
- "摘要今天 Stock 版的熱門討論"

## 技術規格

- **Node.js**: >= 18.0.0
- **主要依賴**:
  - @modelcontextprotocol/sdk: MCP 核心 SDK
  - cheerio: HTML 解析
  - node-fetch: HTTP 請求
  - zod: 資料驗證

## 注意事項

1. **爬蟲禮貌**: 伺服器已內建適當的延遲和請求限制，請勿過度頻繁使用
2. **PTT 政策**: 遵守 PTT 的使用條款和 robots.txt 規範
3. **資料準確性**: 爬取的資料可能因 PTT 版面變更而需要調整
4. **年齡限制**: 自動處理 PTT 的年齡確認機制

## 故障排除

### 常見錯誤

1. **無法取得頁面**: 檢查網路連線和 PTT 是否正常運作
2. **解析失敗**: PTT 版面可能有變更，需要更新選擇器
3. **編碼問題**: 確保系統支援 UTF-8 編碼

### 除錯模式

```bash
npm run dev
```

## 開發

### 修改爬蟲邏輯
主要邏輯在 `index.js` 中的各個方法：
- `getStockPosts24h()`: 文章列表爬取
- `getPostDetail()`: 文章詳細內容
- `summarizePosts()`: 摘要生成

### 新增功能
可以在 `setupToolHandlers()` 中添加新的工具函數。

## 授權

MIT License

## 貢獻

歡迎提交 Pull Request 或開 Issue 來改善這個專案！

## 免責聲明

本工具僅供學習和研究目的使用。使用者需自行承擔使用本工具的風險，並遵守相關法律法規和網站使用條款。