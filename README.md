# PTT Board MCP Server

這是一個 MCP (Model Context Protocol) 伺服器，專門用於擷取多個 PTT 看板的文章和推文資料，並提供摘要功能。支援包括 Stock、Baseball、Gossiping、HatePolitics、Tech_Job、Movie、NBA 等熱門看板。

## 🚀 快速開始

### 在 Claude Desktop 中使用

1. 編輯 Claude Desktop 的配置文件：
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. 添加 MCP 伺服器配置：

```json
{
  "mcpServers": {
    "ptt-board": {
      "command": "node",
      "args": ["/path/to/your/ptt-mcp-server/index.js"]
    }
  }
}
```

3. 重啟 Claude Desktop

### 快速指令範例

- "幫我取得 PTT Baseball 版最新 20 篇文章"
- "分析 NBA 版最近的熱門討論"
- "找出 Stock 版推文數超過 30 的熱門文章"
- "在 Stock 版搜尋包含 '台積電' 的所有文章"

## 功能特色

- 擷取多個 PTT 看板最近的文章列表
- 支援 19 個熱門看板 (Stock, Baseball, NBA, Tech_Job 等)
- 取得文章詳細內容包含所有推文
- 智能摘要文章內容和推文觀點
- 支援推文情緒分析和熱門度計算
- 動態看板名稱驗證和錯誤處理 (即時檢查看板是否存在)
- 推文數過濾 (支援最小值、最大值、範圍過濾)
- 搜尋功能 (同標題文章、關鍵字搜尋、標題搜尋、作者搜尋)
- 標題關鍵字過濾
- 日期過濾 (預設僅今日文章，支援日期範圍查詢)

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

### 1. get_recent_posts

取得指定 PTT 看板最近的文章列表

**參數：**

- `board` (必需): 看板名稱，例如 "Stock", "Baseball", "NBA"
- `limit` (可選): 限制返回文章數量，預設 50，最大 200
- `minPushCount` (可選): 最小推文數過濾，例如 10 表示只返回推文數 >= 10 的文章
- `maxPushCount` (可選): 最大推文數過濾，例如 50 表示只返回推文數 <= 50 的文章
- `titleKeyword` (可選): 標題關鍵字過濾，例如 '台積電' 只返回標題包含此關鍵字的文章
- `onlyToday` (可選): 只顯示今天的文章，預設 true。設為 false 則顯示所有日期
- `dateFrom` (可選): 起始日期過濾，格式 'M/DD' 如 '5/25' 或 'YYYY-MM-DD'，覆蓋 onlyToday 設定
- `dateTo` (可選): 結束日期過濾，格式同 dateFrom，需搭配 dateFrom 使用

**範例：**

基本使用：

```json
{
  "board": "Baseball",
  "limit": 30
}
```

熱門文章過濾 (推文數 >= 20)：

```json
{
  "board": "Stock",
  "limit": 20,
  "minPushCount": 20
}
```

冷門文章過濾 (推文數 <= 5)：

```json
{
  "board": "NBA",
  "limit": 15,
  "maxPushCount": 5
}
```

範圍過濾 (推文數 10-50)：

```json
{
  "board": "Baseball",
  "limit": 25,
  "minPushCount": 10,
  "maxPushCount": 50
}
```

標題關鍵字過濾：

```json
{
  "board": "Stock",
  "limit": 20,
  "titleKeyword": "台積電"
}
```

組合過濾 (台積電 + 高推文數)：

```json
{
  "board": "Stock",
  "limit": 15,
  "titleKeyword": "台積電",
  "minPushCount": 20
}
```

所有日期文章 (關閉今日限制)：

```json
{
  "board": "Baseball",
  "limit": 30,
  "onlyToday": false
}
```

日期範圍過濾：

```json
{
  "board": "Stock",
  "limit": 20,
  "dateFrom": "5/25",
  "dateTo": "5/28"
}
```

組合日期和推文數過濾：

```json
{
  "board": "NBA",
  "limit": 10,
  "dateFrom": "5/27",
  "minPushCount": 15
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

### 4. search_thread_posts

搜尋指定標題的所有相關文章 (同標題文章)

**參數：**

- `board` (必需): 看板名稱，例如 "Stock", "Baseball", "NBA"
- `title` (必需): 要搜尋的文章標題
- `limit` (可選): 限制返回文章數量，預設 30，最大 100

**範例：**

```json
{
  "board": "Baseball",
  "title": "[討論] 紅中根本在亂搞吧",
  "limit": 20
}
```

### 5. search_posts

在指定看板搜尋文章 (支援多種搜尋類型)

**參數：**

- `board` (必需): 看板名稱，例如 "Stock", "Baseball", "NBA"
- `query` (必需): 搜尋關鍵字或片語
- `searchType` (可選): 搜尋類型，"keyword"(全文)、"title"(標題)、"author"(作者)，預設 "keyword"
- `limit` (可選): 限制返回文章數量，預設 30，最大 100

**範例：**

關鍵字搜尋：

```json
{
  "board": "Stock",
  "query": "台積電",
  "searchType": "keyword",
  "limit": 30
}
```

標題搜尋：

```json
{
  "board": "NBA",
  "query": "MVP",
  "searchType": "title",
  "limit": 20
}
```

作者搜尋：

```json
{
  "board": "Stock",
  "query": "某位使用者",
  "searchType": "author",
  "limit": 15
}
```

### 6. list_popular_boards

列出所有支援的 PTT 看板清單

**參數：** 無

**範例：**

```json
{}
```

## 支援的看板

**動態支援**: 本伺服器支援所有公開的 PTT 看板！系統會自動檢查看板是否存在，不再限制於預定義清單。

### 熱門看板範例

| 看板名稱     | 描述                |
| ------------ | ------------------- |
| Stock        | 股票討論版          |
| Baseball     | 棒球討論版          |
| Gossiping    | 八卦版 (需年齡驗證) |
| HatePolitics | 政治黑特版          |
| Tech_Job     | 科技工作版          |
| Movie        | 電影版              |
| NBA          | NBA 討論版          |
| car          | 汽車版              |
| MobileComm   | 手機通訊版          |
| PC_Shopping  | 電腦購物版          |
| Beauty       | 表特版              |
| joke         | 笑話版              |
| marvel       | 漫威版              |
| C_Chat       | C 洽版              |
| Lifeismoney  | 省錢版              |
| WomenTalk    | 女孩版              |
| Boy-Girl     | 男女版              |
| Food         | 美食版              |

> **提示**: 您可以嘗試任何 PTT 看板名稱，系統會自動驗證並告知是否存在。

## 更多使用範例

### 進階指令範例

- "列出所有支援的 PTT 看板"
- "摘要 Tech_Job 版關於台積電的最新文章"
- "取得 Gossiping 版最新 50 篇文章"
- "取得 Baseball 版推文數在 10-50 之間的文章"
- "找 NBA 版推文數較少的冷門討論 (推文數 <= 5)"
- "搜尋 Baseball 版所有關於某個特定討論的文章"
- "找出某位作者在 Tech_Job 版的所有文章"
- "取得 Stock 版標題包含 '財報' 且推文數超過 10 的文章"
- "顯示 NBA 版昨天和今天的所有文章"
- "找出 Baseball 版 5/25 到 5/28 期間的熱門文章"
- "取得 Stock 版今天台積電相關的討論"

## 技術規格

- **Node.js**: >= 18.0.0
- **架構**: 模組化 ES6+ 設計，配備完整測試套件
- **主要依賴**:
  - @modelcontextprotocol/sdk: MCP 核心 SDK
  - cheerio: HTML 解析
  - node-fetch: HTTP 請求
- **開發工具**:
  - Jest: 測試框架 (51 個測試)
  - TypeScript 配置檔案支援

## 注意事項

1. **爬蟲禮貌**: 伺服器已內建適當的延遲和請求限制，請勿過度頻繁使用
2. **PTT 政策**: 遵守 PTT 的使用條款和 robots.txt 規範
3. **資料準確性**: 爬取的資料可能因 PTT 版面變更而需要調整
4. **年齡限制**: 自動處理 PTT 的年齡確認機制 (over18=1)
5. **看板驗證**: 動態檢查看板是否存在，支援所有公開的 PTT 看板，結果會被緩存以提升效能

## 故障排除

### 常見錯誤

1. **無法取得頁面**: 檢查網路連線和 PTT 是否正常運作
2. **無效的看板名稱**: 使用 `list_popular_boards` 查看支援的看板
3. **解析失敗**: PTT 版面可能有變更，需要更新選擇器
4. **編碼問題**: 確保系統支援 UTF-8 編碼

### 除錯模式

```bash
npm run dev
```

## 開發

### 測試

```bash
npm test  # 執行 51 個測試案例
```

### 模組化架構

```
src/
├── utils/           # 工具函數 (DateUtils, PTTUtils)
├── parsers/         # 網頁爬取邏輯 (PTTScraper)
├── tools/           # MCP 工具實作
└── ptt-mcp-server.js # 主服務器協調
```

### 修改爬蟲邏輯

- **工具邏輯**: 在 `src/tools/` 各個工具檔案中
- **爬取邏輯**: 在 `src/parsers/ptt-scraper.js` 中
- **工具函數**: 在 `src/utils/` 中

### 新增看板

系統自動支援所有公開 PTT 看板，無需手動添加。

### 新增功能

1. 在 `src/tools/` 建立新工具類別
2. 在 `src/ptt-mcp-server.js` 註冊新工具
3. 撰寫相對應的測試檔案

## 更新日誌

### v3.0.0 (2025-05-30)

- 🏗️ **重大重構**: 模組化架構設計
- ✅ **完整測試**: 51 個測試案例，確保程式碼品質
- 📦 **分離關注點**: 工具、解析器、工具函數獨立模組
- 🧪 **測試驅動**: Jest 測試框架，涵蓋所有功能
- 🎯 **易於維護**: 每個功能獨立檔案，便於開發和除錯
- 📚 **向下相容**: 保持所有現有 API 和功能

### v2.4.0 (2025-05-28)

- 🌐 動態看板驗證系統 - 支援所有公開 PTT 看板
- ⚡ 智能緩存機制 (有效看板緩存 1 小時，無效看板 10 分鐘)
- 🛡️ 網路錯誤時自動降級到預設看板清單
- 🔄 即時檢查看板是否存在，不再限制於預定義清單

### v2.3.0 (2025-05-28)

- 🔍 新增搜尋功能 (search_thread_posts, search_posts)
- 🔎 支援同標題文章搜尋 (搜尋同標題文章)
- 🎯 支援多種搜尋類型 (關鍵字、標題、作者)
- 🏷️ 新增標題關鍵字過濾到 get_recent_posts
- 🔗 完整的 PTT 搜尋 URL 編碼支援
- 📄 支援搜尋結果分頁處理

### v2.2.0 (2025-05-28)

- 🔍 新增推文數過濾功能 (minPushCount, maxPushCount)
- 🔥 支援熱門文章過濾 (高推文數)
- ❄️ 支援冷門文章過濾 (低推文數)
- 📊 支援範圍過濾 (推文數區間)
- ✅ 完整的參數驗證和錯誤處理
- 📝 更新文檔和使用範例

### v2.1.0 (2025-05-28)

- 🔥 重構為 `get_recent_posts` - 移除不可靠的 24 小時過濾
- ⚡ 改為簡單可靠的"最新 X 篇文章"模式
- 🛡️ 新增文章數量限制驗證 (最大 200 篇)
- 🚫 過濾已刪除文章
- 📈 動態調整翻頁數量以提升效率

### v2.0.0 (2025-05-28)

- 🚀 支援多個 PTT 看板 (19 個熱門看板)
- 🔧 重構 `get_stock_posts_24h` 為 `get_board_posts_24h`
- ✅ 新增 `list_popular_boards` 工具
- 🛡️ 新增看板名稱驗證
- 🐛 修復日期解析邏輯 (24 小時窗口問題)
- 📝 更新完整文檔

### v1.0.0

- 初始版本，僅支援 Stock 版

## 授權

MIT License

## 貢獻

歡迎提交 Pull Request 或開 Issue 來改善這個專案！

## 免責聲明

本工具僅供學習和研究目的使用。使用者需自行承擔使用本工具的風險，並遵守相關法律法規和網站使用條款。
