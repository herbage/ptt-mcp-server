import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { PTTScraper } from './parsers/ptt-scraper.js';
import { ListPostsTool } from './tools/list-posts-tool.js';
import { PostDetailTool } from './tools/post-detail-tool.js';
import { SearchPostsTool } from './tools/search-posts-tool.js';
import { SearchThreadTool } from './tools/search-thread-tool.js';
import { SummarizePostsTool } from './tools/summarize-posts-tool.js';
import { ListBoardsTool } from './tools/list-boards-tool.js';

export class PTTMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "ptt-board-scraper",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.scraper = new PTTScraper();
    this.initializeTools();
    this.setupToolHandlers();
  }

  initializeTools() {
    this.tools = {
      listPosts: new ListPostsTool(this.scraper),
      postDetail: new PostDetailTool(this.scraper),
      searchPosts: new SearchPostsTool(this.scraper),
      searchThread: new SearchThreadTool(this.scraper),
      listBoards: new ListBoardsTool(),
      summarizePosts: null // Will be initialized after postDetail
    };

    // Initialize summarize tool with postDetail dependency
    this.tools.summarizePosts = new SummarizePostsTool(this.scraper, this.tools.postDetail);
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "list_posts",
          description: "列出指定 PTT 看板的文章列表",
          inputSchema: {
            type: "object",
            properties: {
              board: {
                type: "string",
                description: "看板名稱 (例如: Stock, Baseball, Gossiping, HatePolitics, Tech_Job, Movie, NBA)",
                default: "Stock"
              },
              limit: {
                type: "number",
                description: "限制返回文章數量 (預設: 50, 最大: 200)",
                default: 50
              },
              minPushCount: {
                type: "number",
                description: "最小推文數過濾 (可選, 例如: 10 表示只返回推文數 >= 10 的文章)"
              },
              maxPushCount: {
                type: "number", 
                description: "最大推文數過濾 (可選, 例如: 50 表示只返回推文數 <= 50 的文章)"
              },
              titleKeyword: {
                type: "string",
                description: "標題關鍵字過濾 (可選, 例如: '台積電' 只返回標題包含此關鍵字的文章)"
              },
              dateFrom: {
                type: "string",
                description: "起始日期過濾 (可選, 格式: 'M/DD' 如 '5/25' 或 'YYYY-MM-DD' 如 '2025-05-25')"
              },
              dateTo: {
                type: "string", 
                description: "結束日期過濾 (可選, 格式同 dateFrom)。需搭配 dateFrom 使用"
              }
            },
            required: ["board"]
          }
        },
        {
          name: "get_post_detail",
          description: "取得特定文章的詳細內容包含推文",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "文章的 URL"
              }
            },
            required: ["url"]
          }
        },
        {
          name: "search_thread_posts",
          description: "搜尋指定標題的所有相關文章 (同標題文章)",
          inputSchema: {
            type: "object",
            properties: {
              board: {
                type: "string",
                description: "看板名稱 (例如: Stock, Baseball, NBA)",
                default: "Stock"
              },
              title: {
                type: "string",
                description: "要搜尋的文章標題 (例如: '[新聞] 台積電Q4財報亮眼')"
              },
              limit: {
                type: "number",
                description: "限制返回文章數量 (預設: 30, 最大: 100)",
                default: 30
              }
            },
            required: ["board", "title"]
          }
        },
        {
          name: "search_posts",
          description: "在指定看板搜尋文章 (支援多種搜尋類型)",
          inputSchema: {
            type: "object",
            properties: {
              board: {
                type: "string",
                description: "看板名稱 (例如: Stock, Baseball, NBA)",
                default: "Stock"
              },
              query: {
                type: "string",
                description: "搜尋關鍵字或片語"
              },
              searchType: {
                type: "string",
                enum: ["keyword", "title", "author"],
                description: "搜尋類型: keyword(全文搜尋), title(標題包含關鍵字), author(作者)",
                default: "keyword"
              },
              limit: {
                type: "number",
                description: "限制返回文章數量 (預設: 30, 最大: 100)",
                default: 30
              },
              onlyToday: {
                type: "boolean",
                description: "只顯示今天的文章 (預設: false)。設為 true 則只顯示今日文章",
                default: false
              },
              dateFrom: {
                type: "string",
                description: "起始日期過濾 (可選, 格式: 'M/DD' 如 '5/25' 或 'YYYY-MM-DD' 如 '2025-05-25')"
              },
              dateTo: {
                type: "string", 
                description: "結束日期過濾 (可選, 格式同 dateFrom)。需搭配 dateFrom 使用"
              }
            },
            required: ["board", "query"]
          }
        },
        {
          name: "list_popular_boards",
          description: "列出常用的 PTT 看板清單",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "summarize_posts",
          description: "摘要指定文章的內容和推文",
          inputSchema: {
            type: "object",
            properties: {
              posts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" }
                  }
                },
                description: "要摘要的文章列表"
              },
              summaryType: {
                type: "string",
                enum: ["brief", "detailed"],
                description: "摘要類型：簡要或詳細",
                default: "brief"
              }
            },
            required: ["posts"]
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "list_posts":
          return await this.tools.listPosts.execute(request.params.arguments);
        case "search_thread_posts":
          return await this.tools.searchThread.execute(request.params.arguments);
        case "search_posts":
          return await this.tools.searchPosts.execute(request.params.arguments);
        case "get_post_detail":
          return await this.tools.postDetail.execute(request.params.arguments);
        case "summarize_posts":
          return await this.tools.summarizePosts.execute(request.params.arguments);
        case "list_popular_boards":
          return await this.tools.listBoards.execute(request.params.arguments);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("PTT Board MCP Server 已啟動");
  }
}