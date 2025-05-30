import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export class ListBoardsTool {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache
  }

  async execute(args) {
    try {
      const boards = await this.getHotBoards();
      
      return {
        content: [{
          type: "text",
          text: `PTT 即時熱門看板 (依人氣排序):\n\n${boards.map((b, i) => `${i + 1}. ${b.name} (${b.userCount} 人) - ${b.category}\n   ${b.description}`).join('\n\n')}`
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

  async getHotBoards() {
    const cacheKey = 'hotboards';
    const cached = this.cache.get(cacheKey);
    
    // Check if cache is valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const boards = await this.fetchHotBoardsFromPTT();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: boards,
        timestamp: Date.now()
      });
      
      return boards;
    } catch (error) {
      // Fallback to cached data if available
      if (cached) {
        return cached.data;
      }
      
      // Final fallback to static list
      return this.getFallbackBoards();
    }
  }

  async fetchHotBoardsFromPTT() {
    const response = await fetch('https://www.ptt.cc/bbs/hotboards.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': 'over18=1'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const boards = [];

    $('.board').each((i, elem) => {
      const $board = $(elem);
      const name = $board.find('.board-name').text().trim();
      const userCount = parseInt($board.find('.board-nuser').text().trim()) || 0;
      const category = $board.find('.board-class').text().trim();
      const title = $board.find('.board-title').text().trim();
      
      if (name && userCount > 0) {
        // Extract description from title (remove board prefix if exists)
        let description = title.replace(/^◎\[[^\]]+\]\s*/, '').trim();
        if (!description) {
          description = `${category}討論版`;
        }
        
        boards.push({
          name,
          userCount,
          category,
          description,
          title
        });
      }
    });

    // Sort by user count (descending)
    boards.sort((a, b) => b.userCount - a.userCount);
    
    if (boards.length === 0) {
      throw new Error('No boards found in hotboards page');
    }

    return boards;
  }

  getFallbackBoards() {
    return [
      { name: 'Gossiping', userCount: 0, category: '綜合', description: '八卦版 (需年齡驗證)' },
      { name: 'Stock', userCount: 0, category: '學術', description: '股票討論版' },
      { name: 'Baseball', userCount: 0, category: '棒球', description: '棒球討論版' },
      { name: 'NBA', userCount: 0, category: 'NBA', description: 'NBA討論版' },
      { name: 'C_Chat', userCount: 0, category: '閒談', description: 'C洽版' },
      { name: 'HatePolitics', userCount: 0, category: 'Hate', description: '政治黑特版' },
      { name: 'Tech_Job', userCount: 0, category: '工作', description: '科技工作版' },
      { name: 'movie', userCount: 0, category: '綜合', description: '電影版' },
      { name: 'car', userCount: 0, category: '車車', description: '汽車版' },
      { name: 'MobileComm', userCount: 0, category: '資訊', description: '手機通訊版' },
      { name: 'PC_Shopping', userCount: 0, category: '硬體', description: '電腦購物版' },
      { name: 'Beauty', userCount: 0, category: '聊天', description: '表特版' },
      { name: 'joke', userCount: 0, category: '娛樂', description: '笑話版' },
      { name: 'marvel', userCount: 0, category: '生二', description: '漫威版' },
      { name: 'Lifeismoney', userCount: 0, category: '省錢', description: '省錢版' },
      { name: 'WomenTalk', userCount: 0, category: '聊天', description: '女孩版' },
      { name: 'Boy-Girl', userCount: 0, category: '心情', description: '男女版' },
      { name: 'Food', userCount: 0, category: '美食', description: '美食版' }
    ];
  }
}