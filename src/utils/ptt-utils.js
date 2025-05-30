export class PTTUtils {
  static parsePushCount(pushText) {
    if (!pushText) return 0;
    if (pushText === '爆') return 100;
    if (pushText.startsWith('X')) return -10;
    return parseInt(pushText) || 0;
  }

  static encodePTTQuery(query) {
    return encodeURIComponent(query).replace(/%20/g, '+');
  }

  static extractContentSummary(content) {
    if (!content) return "無內容";
    
    const sentences = content.split(/[。！？\n]/).filter(s => s.trim().length > 10);
    const summary = sentences.slice(0, 2).join('。');
    return summary.length > 100 ? summary.substring(0, 100) + "..." : summary;
  }

  static extractMainOpinions(comments) {
    if (!comments || comments.length === 0) return "無推文";

    const pushCount = comments.filter(c => c.type === '推').length;
    const booCount = comments.filter(c => c.type === '噓').length;
    const neutralCount = comments.filter(c => c.type === '→').length;

    return `推 ${pushCount} / 噓 ${booCount} / 中性 ${neutralCount}`;
  }

  static calculatePopularity(comments) {
    if (!comments || comments.length === 0) return "冷門";
    
    const total = comments.length;
    const pushCount = comments.filter(c => c.type === '推').length;
    const positiveRatio = pushCount / total;

    if (total > 50 && positiveRatio > 0.7) return "熱門正面";
    if (total > 30 && positiveRatio > 0.5) return "中等熱度";
    if (total > 50 && positiveRatio < 0.3) return "爭議性高";
    return total > 10 ? "普通" : "冷門";
  }
}