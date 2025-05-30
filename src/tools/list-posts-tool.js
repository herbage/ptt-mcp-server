import { DateUtils } from '../utils/date-utils.js';

export class ListPostsTool {
  constructor(scraper) {
    this.scraper = scraper;
  }

  async execute(args) {
    try {
      const { board = "Stock", pageLimit = 3, minPushCount, maxPushCount, titleKeyword, dateFrom, dateTo } = args || {};
      
      if (!(await this.scraper.isValidBoard(board))) {
        throw new Error(`無效的看板名稱: ${board}. 請使用 list_popular_boards 查看可用看板`);
      }
      
      this.validateInputs({ minPushCount, maxPushCount, dateFrom, dateTo });
      
      const actualPageLimit = Math.min(Math.max(1, pageLimit), 10);
      
      if (this.isDateRangeTooFarBack(dateFrom)) {
        return this.createDateRangeLimitResponse(board);
      }
      
      const posts = await this.fetchFilteredPosts({
        board, actualPageLimit, minPushCount, maxPushCount, 
        titleKeyword, dateFrom, dateTo
      });
      
      return this.createSuccessResponse(posts, board, {
        minPushCount, maxPushCount, titleKeyword, dateFrom, dateTo
      });
    } catch (error) {
      return this.createErrorResponse(error.message);
    }
  }

  validateInputs({ minPushCount, maxPushCount, dateFrom, dateTo }) {
    if (minPushCount !== undefined && (isNaN(minPushCount) || minPushCount < -100)) {
      throw new Error(`無效的最小推文數: ${minPushCount}. 必須是數字且 >= -100`);
    }
    
    if (maxPushCount !== undefined && (isNaN(maxPushCount) || maxPushCount > 200)) {
      throw new Error(`無效的最大推文數: ${maxPushCount}. 必須是數字且 <= 200`);
    }
    
    if (minPushCount !== undefined && maxPushCount !== undefined && minPushCount > maxPushCount) {
      throw new Error(`最小推文數 (${minPushCount}) 不能大於最大推文數 (${maxPushCount})`);
    }
    
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

  isDateRangeTooFarBack(dateFrom) {
    const maxDaysBack = 14;
    const earliestAllowed = new Date();
    earliestAllowed.setDate(earliestAllowed.getDate() - maxDaysBack);
    
    if (dateFrom) {
      const fromDate = DateUtils.parseFlexibleDate(dateFrom);
      return fromDate < earliestAllowed;
    }
    return false;
  }

  createDateRangeLimitResponse(board) {
    const maxDaysBack = 14;
    const earliestAllowed = new Date();
    earliestAllowed.setDate(earliestAllowed.getDate() - maxDaysBack);
    
    return {
      content: [{
        type: "text",
        text: `日期範圍限制：最多只能查詢過去 ${maxDaysBack} 天的文章 (${earliestAllowed.toLocaleDateString('zh-TW')} 之後)。\n\n建議使用 search_posts 功能搜尋更久遠的文章，例如：\n{"board": "${board}", "query": "關鍵字", "searchType": "keyword"}`
      }]
    };
  }

  async fetchFilteredPosts({ board, actualPageLimit, minPushCount, maxPushCount, titleKeyword, dateFrom, dateTo }) {
    const posts = [];
    let currentUrl = `${this.scraper.PTT_BASE_URL}/${board}/index.html`;
    let pageCount = 0;
    
    const maxPages = actualPageLimit;

    while (pageCount < maxPages) {
      const pagePosts = await this.scraper.scrapePostList(currentUrl);
      
      for (const post of pagePosts) {
        if (!DateUtils.isPostInDateRange(post.date, dateFrom, dateTo, false)) continue;
        if (titleKeyword && !post.title.toLowerCase().includes(titleKeyword.toLowerCase())) continue;
        if (minPushCount !== undefined && post.pushCount < minPushCount) continue;
        if (maxPushCount !== undefined && post.pushCount > maxPushCount) continue;

        posts.push(post);
      }

      const html = await this.scraper.fetchWithCookies(currentUrl);
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);
      const prevPageLink = this.scraper.findPrevPageLink($);
      if (!prevPageLink) break;

      currentUrl = 'https://www.ptt.cc' + prevPageLink;
      pageCount++;
    }

    return posts;
  }

  createSuccessResponse(posts, board, filters) {
    const { minPushCount, maxPushCount, titleKeyword, dateFrom, dateTo } = filters;
    const hasFilter = minPushCount !== undefined || maxPushCount !== undefined || titleKeyword;
    const hasDateFilter = dateFrom || dateTo;
    
    let resultMessage = `成功取得 ${posts.length} 篇 PTT ${board} 版最新文章`;
    
    if (hasFilter || hasDateFilter) {
      const filterInfo = [];
      
      if (dateFrom && dateTo) {
        filterInfo.push(`日期範圍 ${dateFrom} 到 ${dateTo}`);
      } else if (dateFrom) {
        filterInfo.push(`${dateFrom} 之後`);
      } else if (dateTo) {
        filterInfo.push(`${dateTo} 之前`);
      }
      if (titleKeyword) filterInfo.push(`標題包含 '${titleKeyword}'`);
      if (minPushCount !== undefined) filterInfo.push(`推文數 >= ${minPushCount}`);
      if (maxPushCount !== undefined) filterInfo.push(`推文數 <= ${maxPushCount}`);
      
      if (filterInfo.length > 0) {
        resultMessage += ` (篩選條件: ${filterInfo.join(', ')})`;
      }
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