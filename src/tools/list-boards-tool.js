export class ListBoardsTool {
  async execute(args) {
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
        content: [{
          type: "text",
          text: `PTT 熱門看板清單:\n\n${boards.map(b => `• ${b.name}: ${b.description}`).join('\n')}`
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
}