import { describe, test, expect, beforeEach } from '@jest/globals';
import { DateUtils } from '../src/utils/date-utils.js';
import { PTTUtils } from '../src/utils/ptt-utils.js';

describe('Refactored Utility Classes', () => {
  describe('DateUtils', () => {
    describe('parseFlexibleDate', () => {
      test('should parse M/DD format (PTT native)', () => {
        const result = DateUtils.parseFlexibleDate('5/25');
        expect(result.getMonth()).toBe(4); // May (0-indexed)
        expect(result.getDate()).toBe(25);
        expect(result.getFullYear()).toBe(new Date().getFullYear());
      });

      test('should parse YYYY-MM-DD format', () => {
        const result = DateUtils.parseFlexibleDate('2025-05-25');
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(4); // May (0-indexed)
        expect(result.getDate()).toBe(25);
      });

      test('should handle special keywords', () => {
        const today = DateUtils.parseFlexibleDate('today');
        const now = new Date();
        expect(today.toDateString()).toBe(new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString());

        const yesterday = DateUtils.parseFlexibleDate('yesterday');
        const yesterdayExpected = new Date(now);
        yesterdayExpected.setDate(yesterdayExpected.getDate() - 1);
        expect(yesterday.toDateString()).toBe(new Date(now.getFullYear(), yesterdayExpected.getMonth(), yesterdayExpected.getDate()).toDateString());
      });

      test('should return null for invalid formats', () => {
        expect(DateUtils.parseFlexibleDate('invalid')).toBe(null);
        expect(DateUtils.parseFlexibleDate('')).toBe(null);
        expect(DateUtils.parseFlexibleDate(null)).toBe(null);
      });
    });

    describe('parsePTTDate', () => {
      test('should parse PTT date format M/DD', () => {
        const result = DateUtils.parsePTTDate('5/25');
        expect(result.getMonth()).toBe(4); // May (0-indexed)
        expect(result.getDate()).toBe(25);
        expect(result.getFullYear()).toBe(new Date().getFullYear());
        expect(result.getHours()).toBe(23);
        expect(result.getMinutes()).toBe(59);
      });

      test('should return epoch for invalid dates', () => {
        const result = DateUtils.parsePTTDate('invalid');
        expect(result.getTime()).toBe(0);
      });
    });

    describe('isPostInDateRange', () => {
      test('should handle onlyToday filter', () => {
        const today = new Date();
        const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;
        
        expect(DateUtils.isPostInDateRange(todayStr, null, null, true)).toBe(true);
        expect(DateUtils.isPostInDateRange('1/1', null, null, true)).toBe(false);
      });

      test('should handle date range filters', () => {
        expect(DateUtils.isPostInDateRange('5/25', '5/20', '5/30', false)).toBe(true);
        expect(DateUtils.isPostInDateRange('5/15', '5/20', '5/30', false)).toBe(false);
      });
    });
  });

  describe('PTTUtils', () => {
    describe('parsePushCount', () => {
      test('should parse normal push counts', () => {
        expect(PTTUtils.parsePushCount('10')).toBe(10);
        expect(PTTUtils.parsePushCount('5')).toBe(5);
        expect(PTTUtils.parsePushCount('99')).toBe(99);
      });

      test('should handle special PTT push count notation', () => {
        expect(PTTUtils.parsePushCount('爆')).toBe(100);
        expect(PTTUtils.parsePushCount('X1')).toBe(-10);
        expect(PTTUtils.parsePushCount('X5')).toBe(-10);
      });

      test('should handle empty or invalid inputs', () => {
        expect(PTTUtils.parsePushCount('')).toBe(0);
        expect(PTTUtils.parsePushCount(null)).toBe(0);
        expect(PTTUtils.parsePushCount(undefined)).toBe(0);
        expect(PTTUtils.parsePushCount('abc')).toBe(0);
      });
    });

    describe('encodePTTQuery', () => {
      test('should encode search queries properly', () => {
        expect(PTTUtils.encodePTTQuery('台積電')).toBe('%E5%8F%B0%E7%A9%8D%E9%9B%BB');
        expect(PTTUtils.encodePTTQuery('test query')).toBe('test+query');
        expect(PTTUtils.encodePTTQuery('special chars: &=+')).toBe('special+chars%3A+%26%3D%2B');
      });
    });

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

      test('should handle empty comments', () => {
        expect(PTTUtils.calculatePopularity([])).toBe('冷門');
        expect(PTTUtils.calculatePopularity(null)).toBe('冷門');
      });
    });
  });
});