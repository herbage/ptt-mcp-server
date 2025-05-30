import { DateUtils } from '../utils/date-utils.js';
import { PTTUtils } from '../utils/ptt-utils.js';

export class SearchPostsTool {
  constructor(scraper) {
    this.scraper = scraper;
  }

  async execute(args) {
    try {
      const { board = "Stock", query, pageLimit = 3, dateFrom, dateTo } = args || {};
      
      if (!(await this.scraper.isValidBoard(board))) {
        throw new Error(`無效的看板名稱: ${board}. 請使用 list_popular_boards 查看可用看板`);
      }
      
      if (!query) {
        throw new Error('需要提供搜尋關鍵字');
      }
      
      this.validateInputs({ pageLimit, dateFrom, dateTo });
      
      const actualPageLimit = Math.min(Math.max(1, pageLimit), 10);
      const posts = await this.performSearch({ board, query, actualPageLimit, dateFrom, dateTo });
      
      return this.createSuccessResponse(posts, query, { dateFrom, dateTo });
    } catch (error) {
      return this.createErrorResponse(error.message);
    }
  }

  validateInputs({ pageLimit, dateFrom, dateTo }) {
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

  async performSearch({ board, query, actualPageLimit, dateFrom, dateTo }) {
    const posts = [];
    
    // PTT natively only supports title search, so we use the query directly
    const encodedQuery = PTTUtils.encodePTTQuery(query);
    let currentUrl = `${this.scraper.PTT_BASE_URL}/${board}/search?q=${encodedQuery}`;
    let pageCount = 0;
    const maxPages = actualPageLimit;

    while (pageCount < maxPages) {
      try {
        const pagePosts = await this.scraper.scrapePostList(currentUrl);
        
        // If no posts found, we've reached the end
        if (pagePosts.length === 0) {
          break;
        }
        
        for (const post of pagePosts) {
          if (!DateUtils.isPostInDateRange(post.date, dateFrom, dateTo, false)) continue;
          
          posts.push(post);
        }

        pageCount++;
        if (pageCount < maxPages) {
          const pageNum = pageCount + 1;
          currentUrl = `${this.scraper.PTT_BASE_URL}/${board}/search?page=${pageNum}&q=${encodedQuery}`;
        }
      } catch (error) {
        // If we get a 404, we've reached the end of results
        if (error.message.includes('404')) {
          break;
        }
        // Re-throw other errors
        throw error;
      }
    }

    return posts;
  }

  createSuccessResponse(posts, query, filters) {
    const { dateFrom, dateTo } = filters;
    
    let resultMessage = `成功搜尋到 ${posts.length} 篇標題包含 "${query}" 的文章`;
    
    const filterInfo = [];
    if (dateFrom && dateTo) {
      filterInfo.push(`日期範圍 ${dateFrom} 到 ${dateTo}`);
    } else if (dateFrom) {
      filterInfo.push(`${dateFrom} 之後`);
    } else if (dateTo) {
      filterInfo.push(`${dateTo} 之前`);
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