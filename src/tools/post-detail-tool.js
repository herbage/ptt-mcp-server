export class PostDetailTool {
  constructor(scraper) {
    this.scraper = scraper;
  }

  async execute(args) {
    try {
      const { url } = args;
      if (!url) {
        throw new Error("需要提供文章 URL");
      }

      const postDetail = await this.scraper.scrapePostDetail(url);

      return {
        content: [{
          type: "text",
          text: `文章詳細內容:\n\n${JSON.stringify(postDetail, null, 2)}`
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