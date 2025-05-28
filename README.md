# PTT Board MCP Server

這是一個 MCP (Model Context Protocol) 伺服器，專門用於擷取多個 PTT 看板的文章和推文資料，並提供摘要功能。支援包括 Stock、Baseball、Gossiping、HatePolitics、Tech_Job、Movie、NBA 等熱門看板。

## 功能特色

- 擷取多個 PTT 看板最近的文章列表
- 支援 19 個熱門看板 (Stock, Baseball, NBA, Tech_Job 等)
- 取得文章詳細內容包含所有推文
- 智能摘要文章內容和推文觀點
- 支援推文情緒分析和熱門度計算
- 看板名稱驗證和錯誤處理
- 推文數過濾 (支援最小值、最大值、範圍過濾)

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

### 4. list_popular_boards
列出所有支援的 PTT 看板清單

**參數：** 無

**範例：**
```json
{}
```

## 支援的看板

| 看板名稱 | 描述 |
|---------|------|
| Stock | 股票討論版 |
| Baseball | 棒球討論版 |
| Gossiping | 八卦版 (需年齡驗證) |
| HatePolitics | 政治黑特版 |
| Tech_Job | 科技工作版 |
| Movie | 電影版 |
| NBA | NBA討論版 |
| car | 汽車版 |
| MobileComm | 手機通訊版 |
| PC_Shopping | 電腦購物版 |
| Beauty | 表特版 |
| joke | 笑話版 |
| marvel | 漫威版 |
| C_Chat | C洽版 |
| Lifeismoney | 省錢版 |
| WomenTalk | 女孩版 |
| Boy-Girl | 男女版 |
| Food | 美食版 |

## 使用方式

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
      "args": ["/path/to/your/ptt-board-mcp-server/index.js"]
    }
  }
}
```

3. 重啟 Claude Desktop

### 指令範例

- "幫我取得 PTT Baseball 版最新 20 篇文章"
- "列出所有支援的 PTT 看板"  
- "分析 NBA 版最近的熱門討論"
- "摘要 Tech_Job 版關於台積電的最新文章"
- "取得 Gossiping 版最新 50 篇文章"
- "找出 Stock 版推文數超過 30 的熱門文章"
- "取得 Baseball 版推文數在 10-50 之間的文章"
- "找 NBA 版推文數較少的冷門討論 (推文數 <= 5)"

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
4. **年齡限制**: 自動處理 PTT 的年齡確認機制 (over18=1)
5. **看板限制**: 只支援預定義的看板列表，無效看板會回傳錯誤

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

### 修改爬蟲邏輯
主要邏輯在 `index.js` 中的各個方法：
- `getRecentPosts()`: 文章列表爬取 (支援多看板)
- `getPostDetail()`: 文章詳細內容
- `summarizePosts()`: 摘要生成
- `listPopularBoards()`: 看板清單
- `isValidBoard()`: 看板驗證

### 新增看板
在 `isValidBoard()` 和 `listPopularBoards()` 方法中添加新的看板支援。

### 新增功能
可以在 `setupToolHandlers()` 中添加新的工具函數。

## 更新日誌

### v2.2.0 (2025-05-28)
- 🔍 新增推文數過濾功能 (minPushCount, maxPushCount)
- 🔥 支援熱門文章過濾 (高推文數)
- ❄️ 支援冷門文章過濾 (低推文數)
- 📊 支援範圍過濾 (推文數區間)
- ✅ 完整的參數驗證和錯誤處理
- 📝 更新文檔和使用範例

### v2.1.0 (2025-05-28)
- 🔥 重構為 `get_recent_posts` - 移除不可靠的24小時過濾
- ⚡ 改為簡單可靠的"最新 X 篇文章"模式
- 🛡️ 新增文章數量限制驗證 (最大 200 篇)
- 🚫 過濾已刪除文章
- 📈 動態調整翻頁數量以提升效率

### v2.0.0 (2025-05-28)
- 🚀 支援多個 PTT 看板 (19個熱門看板)
- 🔧 重構 `get_stock_posts_24h` 為 `get_board_posts_24h`
- ✅ 新增 `list_popular_boards` 工具
- 🛡️ 新增看板名稱驗證
- 🐛 修復日期解析邏輯 (24小時窗口問題)
- 📝 更新完整文檔

### v1.0.0
- 初始版本，僅支援 Stock 版

## 授權

MIT License

## 貢獻

歡迎提交 Pull Request 或開 Issue 來改善這個專案！

## 免責聲明

本工具僅供學習和研究目的使用。使用者需自行承擔使用本工具的風險，並遵守相關法律法規和網站使用條款。