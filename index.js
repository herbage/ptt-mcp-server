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

class PTTMCPServer {
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

    this.PTT_BASE_URL = 'https://www.ptt.cc/bbs';
    this.validBoardsCache = new Map(); // Cache for validated boards
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_recent_posts",
          description: "取得指定 PTT 看板最近的文章列表",
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
              onlyToday: {
                type: "boolean",
                description: "只顯示今天的文章 (預設: true)。設為 false 則顯示所有日期",
                default: true
              },
              dateFrom: {
                type: "string",
                description: "起始日期過濾 (可選, 格式: 'M/DD' 如 '5/25' 或 'YYYY-MM-DD' 如 '2025-05-25')。覆蓋 onlyToday 設定"
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
                description: "起始日期過濾 (可選, 格式: 'M/DD' 如 '5/25' 或 'YYYY-MM-DD' 如 '2025-05-25')。覆蓋 onlyToday 設定"
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
        case "get_recent_posts":
          return await this.getRecentPosts(request.params.arguments);
        case "search_thread_posts":
          return await this.searchThreadPosts(request.params.arguments);
        case "search_posts":
          return await this.searchPosts(request.params.arguments);
        case "get_post_detail":
          return await this.getPostDetail(request.params.arguments);
        case "summarize_posts":
          return await this.summarizePosts(request.params.arguments);
        case "list_popular_boards":
          return await this.listPopularBoards(request.params.arguments);
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

  async getRecentPosts(args) {
    try {
      const { board = "Stock", limit = 50, minPushCount, maxPushCount, titleKeyword, onlyToday = true, dateFrom, dateTo } = args || {};
      
      // Validate board name
      if (!(await this.isValidBoard(board))) {
        throw new Error(`無效的看板名稱: ${board}. 請使用 list_popular_boards 查看可用看板`);
      }
      
      // Validate limit
      const maxLimit = 200;
      const actualLimit = Math.min(Math.max(1, limit), maxLimit);
      
      // Validate push count filters
      if (minPushCount !== undefined && (isNaN(minPushCount) || minPushCount < -100)) {
        throw new Error(`無效的最小推文數: ${minPushCount}. 必須是數字且 >= -100`);
      }
      
      if (maxPushCount !== undefined && (isNaN(maxPushCount) || maxPushCount > 200)) {
        throw new Error(`無效的最大推文數: ${maxPushCount}. 必須是數字且 <= 200`);
      }
      
      if (minPushCount !== undefined && maxPushCount !== undefined && minPushCount > maxPushCount) {
        throw new Error(`最小推文數 (${minPushCount}) 不能大於最大推文數 (${maxPushCount})`);
      }
      
      // Validate date parameters
      if (dateFrom && !this.parseFlexibleDate(dateFrom)) {
        throw new Error(`無效的起始日期格式: ${dateFrom}. 請使用 'M/DD' 或 'YYYY-MM-DD' 格式`);
      }
      
      if (dateTo && !this.parseFlexibleDate(dateTo)) {
        throw new Error(`無效的結束日期格式: ${dateTo}. 請使用 'M/DD' 或 'YYYY-MM-DD' 格式`);
      }
      
      if (dateFrom && dateTo) {
        const fromDate = this.parseFlexibleDate(dateFrom);
        const toDate = this.parseFlexibleDate(dateTo);
        if (fromDate > toDate) {
          throw new Error(`起始日期 (${dateFrom}) 不能晚於結束日期 (${dateTo})`);
        }
      }
      
      // Check if date range is too far back (for efficiency)
      const maxDaysBack = 14; // Reasonable limit for pagination
      const earliestAllowed = new Date();
      earliestAllowed.setDate(earliestAllowed.getDate() - maxDaysBack);
      
      if (dateFrom) {
        const fromDate = this.parseFlexibleDate(dateFrom);
        if (fromDate < earliestAllowed) {
          return {
            content: [
              {
                type: "text",
                text: `日期範圍限制：最多只能查詢過去 ${maxDaysBack} 天的文章 (${earliestAllowed.toLocaleDateString('zh-TW')} 之後)。\n\n建議使用 search_posts 功能搜尋更久遠的文章，例如：\n{"board": "${board}", "query": "關鍵字", "searchType": "keyword"}`
              }
            ]
          };
        }
      }
      
      const posts = [];
      let currentUrl = `${this.PTT_BASE_URL}/${board}/index.html`;
      let pageCount = 0;
      // If filtering, we might need more pages to find enough matching posts  
      const hasFilter = minPushCount !== undefined || maxPushCount !== undefined || titleKeyword;
      const hasDateFilter = dateFrom || dateTo || onlyToday !== false;
      
      // Limit pagination for date filtering to prevent excessive requests
      let maxPages;
      if (hasDateFilter && (dateFrom || dateTo)) {
        maxPages = 15; // Higher limit for date range searches
      } else if (hasFilter) {
        maxPages = Math.ceil(actualLimit / 5) + 5;
      } else {
        maxPages = Math.ceil(actualLimit / 20) + 2;
      }

      while (posts.length < actualLimit && pageCount < maxPages) {
        const html = await this.fetchWithCookies(currentUrl);
        const $ = cheerio.load(html);

        const pageItems = $('.r-ent').toArray();

        for (const item of pageItems) {
          const $item = $(item);
          const title = $item.find('.title a').text().trim();
          const author = $item.find('.author').text().trim();
          const dateStr = $item.find('.date').text().trim();
          const href = $item.find('.title a').attr('href');
          const pushCountText = $item.find('.nrec').text().trim();

          // Skip invalid posts (deleted, etc.)
          if (!title || !href || title.includes('(本文已被刪除)')) continue;
          
          const url = 'https://www.ptt.cc' + href;
          const pushCount = this.parsePushCount(pushCountText);

          // Apply date filter first (most selective)
          if (!this.isPostInDateRange(dateStr, dateFrom, dateTo, onlyToday)) continue;
          
          // Apply title keyword filter
          if (titleKeyword && !title.toLowerCase().includes(titleKeyword.toLowerCase())) continue;
          
          // Apply push count filters
          if (minPushCount !== undefined && pushCount < minPushCount) continue;
          if (maxPushCount !== undefined && pushCount > maxPushCount) continue;

          posts.push({
            title,
            author,
            date: dateStr,
            url,
            pushCount
          });

          if (posts.length >= actualLimit) break;
        }

        if (posts.length >= actualLimit) break;

        // 找到上一頁連結
        const prevPageLink = $('.btn.wide:contains("‹ 上頁")').attr('href');
        if (!prevPageLink) break;

        currentUrl = 'https://www.ptt.cc' + prevPageLink;
        pageCount++;
      }

      // Generate result message with filter info
      let resultMessage = `成功取得 ${posts.length} 篇 PTT ${board} 版最新文章`;
      
      if (hasFilter || hasDateFilter) {
        const filterInfo = [];
        
        // Date filter info
        if (dateFrom && dateTo) {
          filterInfo.push(`日期範圍 ${dateFrom} 到 ${dateTo}`);
        } else if (dateFrom) {
          filterInfo.push(`${dateFrom} 之後`);
        } else if (dateTo) {
          filterInfo.push(`${dateTo} 之前`);
        } else if (onlyToday !== false) {
          filterInfo.push('僅今日');
        }
        
        // Other filters
        if (titleKeyword) filterInfo.push(`標題包含 '${titleKeyword}'`);
        if (minPushCount !== undefined) filterInfo.push(`推文數 >= ${minPushCount}`);
        if (maxPushCount !== undefined) filterInfo.push(`推文數 <= ${maxPushCount}`);
        
        if (filterInfo.length > 0) {
          resultMessage += ` (篩選條件: ${filterInfo.join(', ')})`;
        }
      }
      
      return {
        content: [
          {
            type: "text",
            text: `${resultMessage}:\n\n${JSON.stringify(posts, null, 2)}`
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

  // Helper function to encode search queries for PTT
  encodePTTQuery(query) {
    return encodeURIComponent(query).replace(/%20/g, '+');
  }

  // Helper function to parse flexible date inputs
  parseFlexibleDate(dateStr) {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (!dateStr) return null;
    
    // Handle special keywords
    if (dateStr === 'today') {
      return new Date(currentYear, now.getMonth(), now.getDate());
    }
    if (dateStr === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return new Date(currentYear, yesterday.getMonth(), yesterday.getDate());
    }
    
    // Handle M/DD format (PTT native format)
    const pttMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (pttMatch) {
      const month = parseInt(pttMatch[1]) - 1;
      const day = parseInt(pttMatch[2]);
      return new Date(currentYear, month, day);
    }
    
    // Handle YYYY-MM-DD format
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1;
      const day = parseInt(isoMatch[3]);
      return new Date(year, month, day);
    }
    
    return null;
  }

  // Check if a PTT post date falls within the specified date range
  isPostInDateRange(postDateStr, dateFrom, dateTo, onlyToday) {
    const postDate = this.parsePTTDate(postDateStr);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // If date range is specified, use it (overrides onlyToday)
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? this.parseFlexibleDate(dateFrom) : new Date(1900, 0, 1);
      const toDate = dateTo ? this.parseFlexibleDate(dateTo) : new Date(2100, 11, 31);
      
      if (!fromDate || !toDate) return false;
      
      // Set to end of day for toDate to be inclusive
      toDate.setHours(23, 59, 59, 999);
      
      return postDate >= fromDate && postDate <= toDate;
    }
    
    // Default behavior: only today's posts
    if (onlyToday !== false) {
      return postDate.toDateString() === todayStart.toDateString();
    }
    
    // If onlyToday is explicitly false, include all dates
    return true;
  }

  async searchThreadPosts(args) {
    try {
      const { board = "Stock", title, limit = 30 } = args || {};
      
      // Validate board name
      if (!(await this.isValidBoard(board))) {
        throw new Error(`無效的看板名稱: ${board}. 請使用 list_popular_boards 查看可用看板`);
      }
      
      if (!title) {
        throw new Error('需要提供文章標題');
      }
      
      // Validate limit
      const maxLimit = 100;
      const actualLimit = Math.min(Math.max(1, limit), maxLimit);
      
      const posts = [];
      const searchQuery = `thread:${title}`;
      const encodedQuery = this.encodePTTQuery(searchQuery);
      let currentUrl = `${this.PTT_BASE_URL}/${board}/search?q=${encodedQuery}`;
      let pageCount = 0;
      const maxPages = Math.ceil(actualLimit / 20) + 2;

      while (posts.length < actualLimit && pageCount < maxPages) {
        const html = await this.fetchWithCookies(currentUrl);
        const $ = cheerio.load(html);

        const pageItems = $('.r-ent').toArray();

        for (const item of pageItems) {
          const $item = $(item);
          const postTitle = $item.find('.title a').text().trim();
          const author = $item.find('.author').text().trim();
          const dateStr = $item.find('.date').text().trim();
          const href = $item.find('.title a').attr('href');
          const pushCountText = $item.find('.nrec').text().trim();

          // Skip invalid posts
          if (!postTitle || !href || postTitle.includes('(本文已被刪除)')) continue;
          
          const url = 'https://www.ptt.cc' + href;
          const pushCount = this.parsePushCount(pushCountText);

          posts.push({
            title: postTitle,
            author,
            date: dateStr,
            url,
            pushCount
          });

          if (posts.length >= actualLimit) break;
        }

        if (posts.length >= actualLimit) break;

        // Find next page link for search results
        const nextPageBtn = $('.btn.wide:contains("下頁 ›")');
        if (nextPageBtn.length === 0) break;
        
        const nextPageHref = nextPageBtn.attr('href');
        if (!nextPageHref) break;

        currentUrl = 'https://www.ptt.cc' + nextPageHref;
        pageCount++;
      }

      return {
        content: [
          {
            type: "text",
            text: `成功搜尋到 ${posts.length} 篇標題為 "${title}" 的相關文章:\n\n${JSON.stringify(posts, null, 2)}`
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

  async searchPosts(args) {
    try {
      const { board = "Stock", query, searchType = "keyword", limit = 30, onlyToday = false, dateFrom, dateTo } = args || {};
      
      // Validate board name
      if (!(await this.isValidBoard(board))) {
        throw new Error(`無效的看板名稱: ${board}. 請使用 list_popular_boards 查看可用看板`);
      }
      
      if (!query) {
        throw new Error('需要提供搜尋關鍵字');
      }
      
      // Validate limit
      const maxLimit = 100;
      const actualLimit = Math.min(Math.max(1, limit), maxLimit);
      
      // Validate date parameters
      if (dateFrom && !this.parseFlexibleDate(dateFrom)) {
        throw new Error(`無效的起始日期格式: ${dateFrom}. 請使用 'M/DD' 或 'YYYY-MM-DD' 格式`);
      }
      
      if (dateTo && !this.parseFlexibleDate(dateTo)) {
        throw new Error(`無效的結束日期格式: ${dateTo}. 請使用 'M/DD' 或 'YYYY-MM-DD' 格式`);
      }
      
      if (dateFrom && dateTo) {
        const fromDate = this.parseFlexibleDate(dateFrom);
        const toDate = this.parseFlexibleDate(dateTo);
        if (fromDate > toDate) {
          throw new Error(`起始日期 (${dateFrom}) 不能晚於結束日期 (${dateTo})`);
        }
      }
      
      const posts = [];
      
      // Build search query based on search type
      let searchQuery;
      switch (searchType) {
        case 'title':
          // For title searches, use keyword search for better partial matching
          // PTT's title: prefix requires more exact matches
          searchQuery = query;
          break;
        case 'author':
          searchQuery = `author:${query}`;
          break;
        case 'keyword':
        default:
          searchQuery = query;
          break;
      }
      
      const encodedQuery = this.encodePTTQuery(searchQuery);
      let currentUrl = `${this.PTT_BASE_URL}/${board}/search?q=${encodedQuery}`;
      let pageCount = 0;
      const maxPages = Math.ceil(actualLimit / 20) + 2;

      while (posts.length < actualLimit && pageCount < maxPages) {
        const html = await this.fetchWithCookies(currentUrl);
        const $ = cheerio.load(html);

        const pageItems = $('.r-ent').toArray();

        for (const item of pageItems) {
          const $item = $(item);
          const title = $item.find('.title a').text().trim();
          const author = $item.find('.author').text().trim();
          const dateStr = $item.find('.date').text().trim();
          const href = $item.find('.title a').attr('href');
          const pushCountText = $item.find('.nrec').text().trim();

          // Skip invalid posts
          if (!title || !href || title.includes('(本文已被刪除)')) continue;
          
          // Apply search type filter
          if (searchType === 'title' && !title.toLowerCase().includes(query.toLowerCase())) continue;
          
          // Apply date filter
          if (!this.isPostInDateRange(dateStr, dateFrom, dateTo, onlyToday)) continue;
          
          const url = 'https://www.ptt.cc' + href;
          const pushCount = this.parsePushCount(pushCountText);

          posts.push({
            title,
            author,
            date: dateStr,
            url,
            pushCount
          });

          if (posts.length >= actualLimit) break;
        }

        if (posts.length >= actualLimit) break;

        // Find next page link for search results
        const nextPageBtn = $('.btn.wide:contains("下頁 ›")');
        if (nextPageBtn.length === 0) break;
        
        const nextPageHref = nextPageBtn.attr('href');
        if (!nextPageHref) break;

        currentUrl = 'https://www.ptt.cc' + nextPageHref;
        pageCount++;
      }

      const searchTypeDesc = { keyword: '關鍵字', title: '標題', author: '作者' }[searchType];
      
      // Generate result message with filter info
      let resultMessage = `成功以${searchTypeDesc}搜尋到 ${posts.length} 篇包含 "${query}" 的文章`;
      
      const filterInfo = [];
      if (dateFrom && dateTo) {
        filterInfo.push(`日期範圍 ${dateFrom} 到 ${dateTo}`);
      } else if (dateFrom) {
        filterInfo.push(`${dateFrom} 之後`);
      } else if (dateTo) {
        filterInfo.push(`${dateTo} 之前`);
      } else if (onlyToday) {
        filterInfo.push('僅今日');
      }
      
      if (filterInfo.length > 0) {
        resultMessage += ` (篩選條件: ${filterInfo.join(', ')})`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: `${resultMessage}:\n\n${JSON.stringify(posts, null, 2)}`
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

  async isValidBoard(board) {
    // Check cache first
    if (this.validBoardsCache.has(board)) {
      return this.validBoardsCache.get(board);
    }

    try {
      // Try to fetch the board's index page to check if it exists
      const boardUrl = `${this.PTT_BASE_URL}/${board}/index.html`;
      const response = await fetch(boardUrl, {
        headers: {
          'Cookie': 'over18=1',
          'User-Agent': 'Mozilla/5.0 (compatible; PTT-MCP-Server/2.0)'
        }
      });

      const isValid = response.status === 200;
      
      // Cache the result (valid boards cached for 1 hour, invalid for 10 minutes)
      this.validBoardsCache.set(board, isValid);
      setTimeout(() => {
        this.validBoardsCache.delete(board);
      }, isValid ? 60 * 60 * 1000 : 10 * 60 * 1000);

      return isValid;
    } catch (error) {
      // If network error, fallback to hardcoded list for known popular boards
      const fallbackBoards = [
        'Stock', 'Baseball', 'Gossiping', 'HatePolitics', 
        'Tech_Job', 'Movie', 'NBA', 'car', 'MobileComm',
        'PC_Shopping', 'Beauty', 'joke', 'marvel', 'C_Chat',
        'nba', 'Lifeismoney', 'WomenTalk', 'Boy-Girl', 'Food'
      ];
      const isValid = fallbackBoards.includes(board);
      
      // Cache fallback result for shorter time
      this.validBoardsCache.set(board, isValid);
      setTimeout(() => {
        this.validBoardsCache.delete(board);
      }, 5 * 60 * 1000); // 5 minutes

      return isValid;
    }
  }

  async listPopularBoards() {
    try {
      const boards = [
        { name: 'Stock', description: '股票討論版' },
        { name: 'Baseball', description: '棒球討論版' },
        { name: 'Gossiping', description: '八卦版 (需年齡驗證)' },
        { name: 'HatePolitics', description: '政治黑特版' },
        { name: 'Tech_Job', description: '科技工作版' },
        { name: 'Movie', description: '電影版' },
        { name: 'NBA', description: 'NBA討論版' },
        { name: 'car', description: '汽車版' },
        { name: 'MobileComm', description: '手機通訊版' },
        { name: 'PC_Shopping', description: '電腦購物版' },
        { name: 'Beauty', description: '表特版' },
        { name: 'joke', description: '笑話版' },
        { name: 'marvel', description: '漫威版' },
        { name: 'C_Chat', description: 'C洽版' },
        { name: 'Lifeismoney', description: '省錢版' },
        { name: 'WomenTalk', description: '女孩版' },
        { name: 'Boy-Girl', description: '男女版' },
        { name: 'Food', description: '美食版' }
      ];

      return {
        content: [
          {
            type: "text",
            text: `PTT 熱門看板清單:\n\n${boards.map(b => `• ${b.name}: ${b.description}`).join('\n')}`
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("PTT Board MCP Server 已啟動");
  }
}

// Export for testing
export { PTTMCPServer };

// 啟動伺服器 (only if running directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new PTTMCPServer();
  server.run().catch(console.error);
}