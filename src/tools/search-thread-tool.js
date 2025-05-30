import { PTTUtils } from '../utils/ptt-utils.js';

export class SearchThreadTool {
  constructor(scraper) {
    this.scraper = scraper;
  }

  async execute(args) {
    try {
      const { board = "Stock", title, limit = 30 } = args || {};
      
      if (!(await this.scraper.isValidBoard(board))) {
        throw new Error(`無效的看板名稱: ${board}. 請使用 list_popular_boards 查看可用看板`);
      }
      
      if (!title) {
        throw new Error('需要提供文章標題');
      }
      
      const actualLimit = Math.min(Math.max(1, limit), 100);
      const posts = await this.searchThreadPosts(board, title, actualLimit);
      
      return {
        content: [{
          type: "text",
          text: `成功搜尋到 ${posts.length} 篇標題為 "${title}" 的相關文章:\n\n${JSON.stringify(posts, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `錯誤: ${error.message}`
        }],
        isError: true
      };
    }
  }

  async searchThreadPosts(board, title, actualLimit) {
    const posts = [];
    const searchQuery = `thread:${title}`;
    const encodedQuery = PTTUtils.encodePTTQuery(searchQuery);
    let currentUrl = `${this.scraper.PTT_BASE_URL}/${board}/search?q=${encodedQuery}`;
    let pageCount = 0;
    const maxPages = Math.ceil(actualLimit / 20) + 2;

    while (posts.length < actualLimit && pageCount < maxPages) {
      const pagePosts = await this.scraper.scrapePostList(currentUrl);
      
      for (const post of pagePosts) {
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
}