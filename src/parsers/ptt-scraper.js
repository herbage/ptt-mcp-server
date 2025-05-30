import fetch from "node-fetch";
import * as cheerio from "cheerio";

export class PTTScraper {
  constructor() {
    this.PTT_BASE_URL = 'https://www.ptt.cc/bbs';
    this.validBoardsCache = new Map();
  }

  async fetchWithCookies(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': 'over18=1'
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

  async isValidBoard(board) {
    if (this.validBoardsCache.has(board)) {
      return this.validBoardsCache.get(board);
    }

    try {
      const boardUrl = `${this.PTT_BASE_URL}/${board}/index.html`;
      const response = await fetch(boardUrl, {
        headers: {
          'Cookie': 'over18=1',
          'User-Agent': 'Mozilla/5.0 (compatible; PTT-MCP-Server/2.0)'
        }
      });

      const isValid = response.status === 200;
      
      this.validBoardsCache.set(board, isValid);
      setTimeout(() => {
        this.validBoardsCache.delete(board);
      }, isValid ? 60 * 60 * 1000 : 10 * 60 * 1000);

      return isValid;
    } catch (error) {
      const fallbackBoards = [
        'Stock', 'Baseball', 'Gossiping', 'HatePolitics', 
        'Tech_Job', 'Movie', 'NBA', 'car', 'MobileComm',
        'PC_Shopping', 'Beauty', 'joke', 'marvel', 'C_Chat',
        'nba', 'Lifeismoney', 'WomenTalk', 'Boy-Girl', 'Food'
      ];
      const isValid = fallbackBoards.includes(board);
      
      this.validBoardsCache.set(board, isValid);
      setTimeout(() => {
        this.validBoardsCache.delete(board);
      }, 5 * 60 * 1000);

      return isValid;
    }
  }

  async scrapePostList(url) {
    const html = await this.fetchWithCookies(url);
    const $ = cheerio.load(html);
    const posts = [];

    $('.r-ent').each((_, element) => {
      const $item = $(element);
      const title = $item.find('.title a').text().trim();
      const author = $item.find('.author').text().trim();
      const dateStr = $item.find('.date').text().trim();
      const href = $item.find('.title a').attr('href');
      const pushCountText = $item.find('.nrec').text().trim();

      if (!title || !href || title.includes('(本文已被刪除)')) return;
      
      posts.push({
        title,
        author,
        date: dateStr,
        url: 'https://www.ptt.cc' + href,
        pushCount: this.parsePushCount(pushCountText)
      });
    });

    return posts;
  }

  async scrapePostDetail(url) {
    const html = await this.fetchWithCookies(url);
    const $ = cheerio.load(html);

    const content = $('#main-content').clone();
    content.find('.article-metaline').remove();
    content.find('.article-metaline-right').remove();
    content.find('.push').remove();
    const articleContent = content.text().trim();

    const comments = [];
    $('.push').each((_, element) => {
      const $push = $(element);
      const type = $push.find('.push-tag').text().trim();
      const author = $push.find('.push-userid').text().trim();
      const content = $push.find('.push-content').text().replace(/^:\s*/, '').trim();
      const time = $push.find('.push-ipdatetime').text().trim();

      comments.push({ type, author, content, time });
    });

    return {
      url,
      content: articleContent,
      comments,
      commentCount: comments.length
    };
  }

  parsePushCount(pushText) {
    if (!pushText) return 0;
    if (pushText === '爆') return 100;
    if (pushText.startsWith('X')) return -10;
    return parseInt(pushText) || 0;
  }

  findPrevPageLink($) {
    return $('.btn.wide:contains("‹ 上頁")').attr('href');
  }

  findNextPageLink($) {
    return $('.btn.wide:contains("下頁 ›")').attr('href');
  }
}