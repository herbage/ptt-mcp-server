#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

// PTT 文章結構 (使用 JSDoc 註解)
/**
 * @typedef {Object} PTTPost
 * @property {string} title
 * @property {string} author
 * @property {string} date
 * @property {string} url
 * @property {number} pushCount
 * @property {string} [content]
 * @property {Comment[]} [comments]
 */

/**
 * @typedef {Object} Comment
 * @property {string} type - 推/噓/→
 * @property {string} author
 * @property {string} content
 * @property {string} time
 */

class PTTStockMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "ptt-stock-scraper",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.PTT_STOCK_URL = 'https://www.ptt.cc/bbs/Stock/index.html';
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_stock_posts_24h",
          description: "取得 PTT Stock 版過去 24 小時的文章列表",
          inputSchema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "限制返回文章數量 (預設: 50)",
                default: 50
              }
            }
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
        case "get_stock_posts_24h":
          return await this.getStockPosts24h(request.params.arguments);
        case "get_post_detail":
          return await this.getPostDetail(request.params.arguments);
        case "summarize_posts":
          return await this.summarizePosts(request.params.arguments);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async fetchWithCookies(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': 'over18=1' // PTT 年齡確認 cookie
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      throw new Error(`取得頁面失敗: ${error.message}`);
    }
  }

  async getStockPosts24h(args) {
    try {
      const limit = args?.limit || 50;
      const posts = [];
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      let currentUrl = this.PTT_STOCK_URL;
      let pageCount = 0;
      const maxPages = 5; // 限制搜尋頁數避免過度爬取

      while (posts.length < limit && pageCount < maxPages) {
        const html = await this.fetchWithCookies(currentUrl);
        const $ = cheerio.load(html);

        const pageItems = $('.r-ent').toArray();
        let foundOldPost = false;

        for (const item of pageItems) {
          const $item = $(item);
          const title = $item.find('.title a').text().trim();
          const author = $item.find('.author').text().trim();
          const dateStr = $item.find('.date').text().trim();
          const url = 'https://www.ptt.cc' + $item.find('.title a').attr('href');
          const pushCountText = $item.find('.nrec').text().trim();

          if (!title || !url) continue;

          // 解析日期 (PTT 格式: M/DD)
          const postDate = this.parsePTTDate(dateStr);
          
          if (postDate < twentyFourHoursAgo) {
            foundOldPost = true;
            break;
          }

          const pushCount = this.parsePushCount(pushCountText);

          posts.push({
            title,
            author,
            date: dateStr,
            url,
            pushCount
          });

          if (posts.length >= limit) break;
        }

        if (foundOldPost || posts.length >= limit) break;

        // 找到上一頁連結
        const prevPageLink = $('.btn.wide:contains("‹ 上頁")').attr('href');
        if (!prevPageLink) break;

        currentUrl = 'https://www.ptt.cc' + prevPageLink;
        pageCount++;
      }

      return {
        content: [
          {
            type: "text",
            text: `成功取得 ${posts.length} 篇 PTT Stock 版過去 24 小時文章:\n\n${JSON.stringify(posts, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `錯誤: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async getPostDetail(args) {
    try {
      const { url } = args;
      if (!url) {
        throw new Error("需要提供文章 URL");
      }

      const html = await this.fetchWithCookies(url);
      const $ = cheerio.load(html);

      // 取得文章內容
      const content = $('#main-content').clone();
      content.find('.article-metaline').remove();
      content.find('.article-metaline-right').remove();
      content.find('.push').remove();
      const articleContent = content.text().trim();

      // 取得推文
      const comments = [];
      $('.push').each((_, element) => {
        const $push = $(element);
        const type = $push.find('.push-tag').text().trim();
        const author = $push.find('.push-userid').text().trim();
        const content = $push.find('.push-content').text().replace(/^:\s*/, '').trim();
        const time = $push.find('.push-ipdatetime').text().trim();

        comments.push({ type, author, content, time });
      });

      const postDetail = {
        url,
        content: articleContent,
        comments,
        commentCount: comments.length
      };

      return {
        content: [
          {
            type: "text",
            text: `文章詳細內容:\n\n${JSON.stringify(postDetail, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `錯誤: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async summarizePosts(args) {
    try {
      const { posts, summaryType = "brief" } = args;
      if (!posts || !Array.isArray(posts)) {
        throw new Error("需要提供文章列表");
      }

      const summaries = [];

      for (const post of posts) {
        try {
          const detailResult = await this.getPostDetail({ url: post.url });
          const detailContent = JSON.parse(detailResult.content[0].text.replace('文章詳細內容:\n\n', ''));

          let summary = `標題: ${post.title}\n`;
          
          if (summaryType === "detailed") {
            summary += `內容摘要: ${this.extractContentSummary(detailContent.content)}\n`;
            summary += `推文統計: 共 ${detailContent.commentCount} 則回應\n`;
            summary += `主要觀點: ${this.extractMainOpinions(detailContent.comments)}\n`;
          } else {
            summary += `回應數: ${detailContent.commentCount}\n`;
            summary += `熱門度: ${this.calculatePopularity(detailContent.comments)}\n`;
          }

          summaries.push(summary);
        } catch (error) {
          summaries.push(`${post.title}: 無法取得詳細資訊 (${error.message})`);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `文章摘要報告:\n\n${summaries.join('\n---\n')}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `錯誤: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  parsePTTDate(dateStr) {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // PTT 日期格式通常是 M/DD
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
    if (!match) return new Date(0);

    const month = parseInt(match[1]) - 1; // JS 月份從 0 開始
    const day = parseInt(match[2]);
    
    // 設定為當天的結束時間 (23:59:59) 以給予更寬鬆的24小時判斷
    return new Date(currentYear, month, day, 23, 59, 59);
  }

  parsePushCount(pushText) {
    if (!pushText) return 0;
    if (pushText === '爆') return 100;
    if (pushText.startsWith('X')) return -10;
    return parseInt(pushText) || 0;
  }

  extractContentSummary(content) {
    if (!content) return "無內容";
    
    // 簡單的內容摘要邏輯
    const sentences = content.split(/[。！？\n]/).filter(s => s.trim().length > 10);
    const summary = sentences.slice(0, 2).join('。');
    return summary.length > 100 ? summary.substring(0, 100) + "..." : summary;
  }

  extractMainOpinions(comments) {
    if (!comments || comments.length === 0) return "無推文";

    const pushCount = comments.filter(c => c.type === '推').length;
    const booCount = comments.filter(c => c.type === '噓').length;
    const neutralCount = comments.filter(c => c.type === '→').length;

    return `推 ${pushCount} / 噓 ${booCount} / 中性 ${neutralCount}`;
  }

  calculatePopularity(comments) {
    if (!comments || comments.length === 0) return "冷門";
    
    const total = comments.length;
    const pushCount = comments.filter(c => c.type === '推').length;
    const positiveRatio = pushCount / total;

    if (total > 50 && positiveRatio > 0.7) return "熱門正面";
    if (total > 30 && positiveRatio > 0.5) return "中等熱度";
    if (total > 50 && positiveRatio < 0.3) return "爭議性高";
    return total > 10 ? "普通" : "冷門";
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("PTT Stock MCP Server 已啟動");
  }
}

// 啟動伺服器
const server = new PTTStockMCPServer();
server.run().catch(console.error);