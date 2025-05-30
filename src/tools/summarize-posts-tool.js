import { PTTUtils } from '../utils/ptt-utils.js';

export class SummarizePostsTool {
  constructor(scraper, postDetailTool) {
    this.scraper = scraper;
    this.postDetailTool = postDetailTool;
  }

  async execute(args) {
    try {
      const { posts, summaryType = "brief" } = args;
      if (!posts || !Array.isArray(posts)) {
        throw new Error("需要提供文章列表");
      }

      const summaries = [];

      for (const post of posts) {
        try {
          const detailResult = await this.postDetailTool.execute({ url: post.url });
          const detailContent = JSON.parse(detailResult.content[0].text.replace('文章詳細內容:\n\n', ''));

          let summary = `標題: ${post.title}\n`;
          
          if (summaryType === "detailed") {
            summary += `內容摘要: ${PTTUtils.extractContentSummary(detailContent.content)}\n`;
            summary += `推文統計: 共 ${detailContent.commentCount} 則回應\n`;
            summary += `主要觀點: ${PTTUtils.extractMainOpinions(detailContent.comments)}\n`;
          } else {
            summary += `回應數: ${detailContent.commentCount}\n`;
            summary += `熱門度: ${PTTUtils.calculatePopularity(detailContent.comments)}\n`;
          }

          summaries.push(summary);
        } catch (error) {
          summaries.push(`${post.title}: 無法取得詳細資訊 (${error.message})`);
        }
      }

      return {
        content: [{
          type: "text",
          text: `文章摘要報告:\n\n${summaries.join('\n---\n')}`
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