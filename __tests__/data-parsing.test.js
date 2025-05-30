import { describe, test, expect } from '@jest/globals';
import { PTTUtils } from '../index.js';

describe('Data Parsing Methods', () => {
  describe('extractContentSummary', () => {
    test('should extract summary from content', () => {
      const content = '這是第一句比較長的話應該會被包含。這是第二句話也應該要被包含進來！這是第三句話也是比較長的？第四句話會被截掉因為只取前兩句。';
      const result = PTTUtils.extractContentSummary(content);
      expect(result).toBe('這是第一句比較長的話應該會被包含。這是第二句話也應該要被包含進來');
    });

    test('should handle empty content', () => {
      expect(PTTUtils.extractContentSummary('')).toBe('無內容');
      expect(PTTUtils.extractContentSummary(null)).toBe('無內容');
      expect(PTTUtils.extractContentSummary(undefined)).toBe('無內容');
    });

    test('should truncate long summaries', () => {
      const longContent = '這是一個非常長的句子'.repeat(20) + '。這是第二個句子。';
      const result = PTTUtils.extractContentSummary(longContent);
      expect(result.length).toBeLessThanOrEqual(103); // 100 chars + "..."
      expect(result.endsWith('...')).toBe(true);
    });

    test('should filter out short sentences', () => {
      const content = '短句。這是一個比較長的句子應該會被包含在摘要中。另一個短句。這是另一個比較長的句子也應該被包含。';
      const result = PTTUtils.extractContentSummary(content);
      expect(result).toContain('這是一個比較長的句子應該會被包含在摘要中');
      expect(result).toContain('這是另一個比較長的句子也應該被包含');
      expect(result).not.toContain('短句');
    });
  });

  describe('extractMainOpinions', () => {
    test('should analyze comment sentiment', () => {
      const comments = [
        { type: '推', author: 'user1', content: '好文推', time: '01/01' },
        { type: '推', author: 'user2', content: '讚', time: '01/01' },
        { type: '噓', author: 'user3', content: '不認同', time: '01/01' },
        { type: '→', author: 'user4', content: '中性意見', time: '01/01' }
      ];
      
      const result = PTTUtils.extractMainOpinions(comments);
      expect(result).toBe('推 2 / 噓 1 / 中性 1');
    });

    test('should handle empty comments', () => {
      expect(PTTUtils.extractMainOpinions([])).toBe('無推文');
      expect(PTTUtils.extractMainOpinions(null)).toBe('無推文');
      expect(PTTUtils.extractMainOpinions(undefined)).toBe('無推文');
    });

    test('should count only specific comment types', () => {
      const comments = [
        { type: '推', author: 'user1', content: 'good', time: '01/01' },
        { type: '未知', author: 'user2', content: 'unknown type', time: '01/01' }
      ];
      
      const result = PTTUtils.extractMainOpinions(comments);
      expect(result).toBe('推 1 / 噓 0 / 中性 0');
    });
  });

  describe('calculatePopularity', () => {
    test('should classify popular positive posts', () => {
      const comments = Array(60).fill().map((_, i) => ({
        type: i < 50 ? '推' : '→',
        author: `user${i}`,
        content: 'comment',
        time: '01/01'
      }));
      
      const result = PTTUtils.calculatePopularity(comments);
      expect(result).toBe('熱門正面');
    });

    test('should classify medium popularity posts', () => {
      const comments = Array(35).fill().map((_, i) => ({
        type: i < 20 ? '推' : '→',
        author: `user${i}`,
        content: 'comment',
        time: '01/01'
      }));
      
      const result = PTTUtils.calculatePopularity(comments);
      expect(result).toBe('中等熱度');
    });

    test('should classify controversial posts', () => {
      const comments = Array(60).fill().map((_, i) => ({
        type: i < 15 ? '推' : '噓',
        author: `user${i}`,
        content: 'comment',
        time: '01/01'
      }));
      
      const result = PTTUtils.calculatePopularity(comments);
      expect(result).toBe('爭議性高');
    });

    test('should classify normal and cold posts', () => {
      const normalComments = Array(15).fill().map((_, i) => ({
        type: '推',
        author: `user${i}`,
        content: 'comment',
        time: '01/01'
      }));
      expect(PTTUtils.calculatePopularity(normalComments)).toBe('普通');

      const coldComments = Array(5).fill().map((_, i) => ({
        type: '推',
        author: `user${i}`,
        content: 'comment',
        time: '01/01'
      }));
      expect(PTTUtils.calculatePopularity(coldComments)).toBe('冷門');
    });

    test('should handle empty or null comments', () => {
      expect(PTTUtils.calculatePopularity([])).toBe('冷門');
      expect(PTTUtils.calculatePopularity(null)).toBe('冷門');
      expect(PTTUtils.calculatePopularity(undefined)).toBe('冷門');
    });
  });
});