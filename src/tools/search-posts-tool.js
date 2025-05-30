import { DateUtils } from '../utils/date-utils.js';
import { PTTUtils } from '../utils/ptt-utils.js';

export class SearchPostsTool {
  constructor(scraper) {
    this.scraper = scraper;
  }

  async execute(args) {
    try {
      const { board = "Stock", query, searchType = "keyword", limit = 30, onlyToday = false, dateFrom, dateTo } = args || {};
      
      if (!(await this.scraper.isValidBoard(board))) {
        throw new Error(`無效的看板名稱: ${board}. 請使用 list_popular_boards 查看可用看板`);
      }
      
      if (!query) {
        throw new Error('需要提供搜尋關鍵字');
      }
      
      this.validateInputs({ limit, dateFrom, dateTo });
      
      const actualLimit = Math.min(Math.max(1, limit), 100);
      const posts = await this.performSearch({ board, query, searchType, actualLimit, onlyToday, dateFrom, dateTo });
      
      return this.createSuccessResponse(posts, query, searchType, { onlyToday, dateFrom, dateTo });
    } catch (error) {
      return this.createErrorResponse(error.message);
    }
  }

  validateInputs({ limit, dateFrom, dateTo }) {
    if (dateFrom && !DateUtils.parseFlexibleDate(dateFrom)) {
      throw new Error(`無效的起始日期格式: ${dateFrom}. 請使用 'M/DD' 或 'YYYY-MM-DD' 格式`);
    }
    
    if (dateTo && !DateUtils.parseFlexibleDate(dateTo)) {
      throw new Error(`無效的結束日期格式: ${dateTo}. 請使用 'M/DD' 或 'YYYY-MM-DD' 格式`);
    }
    
    if (dateFrom && dateTo) {
      const fromDate = DateUtils.parseFlexibleDate(dateFrom);
      const toDate = DateUtils.parseFlexibleDate(dateTo);
      if (fromDate > toDate) {
        throw new Error(`起始日期 (${dateFrom}) 不能晚於結束日期 (${dateTo})`);
      }
    }
  }

  async performSearch({ board, query, searchType, actualLimit, onlyToday, dateFrom, dateTo }) {
    const posts = [];
    
    let searchQuery;
    switch (searchType) {
      case 'title':
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
    
    const encodedQuery = PTTUtils.encodePTTQuery(searchQuery);
    let currentUrl = `${this.scraper.PTT_BASE_URL}/${board}/search?q=${encodedQuery}`;
    let pageCount = 0;
    const maxPages = Math.ceil(actualLimit / 20) + 2;

    while (posts.length < actualLimit && pageCount < maxPages) {
      const pagePosts = await this.scraper.scrapePostList(currentUrl);
      
      for (const post of pagePosts) {
        if (searchType === 'title' && !post.title.toLowerCase().includes(query.toLowerCase())) continue;
        if (!DateUtils.isPostInDateRange(post.date, dateFrom, dateTo, onlyToday)) continue;
        
        posts.push(post);
        if (posts.length >= actualLimit) break;
      }

      if (posts.length >= actualLimit) break;

      const html = await this.scraper.fetchWithCookies(currentUrl);
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);
      const nextPageLink = this.scraper.findNextPageLink($);
      if (!nextPageLink) break;

      currentUrl = 'https://www.ptt.cc' + nextPageLink;
      pageCount++;
    }

    return posts;
  }

  createSuccessResponse(posts, query, searchType, filters) {
    const { onlyToday, dateFrom, dateTo } = filters;
    const searchTypeDesc = { keyword: '關鍵字', title: '標題', author: '作者' }[searchType];
    
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
      content: [{
        type: "text",
        text: `${resultMessage}:\n\n${JSON.stringify(posts, null, 2)}`
      }]
    };
  }

  createErrorResponse(message) {
    return {
      content: [{
        type: "text",
        text: `錯誤: ${message}`
      }],
      isError: true
    };
  }
}