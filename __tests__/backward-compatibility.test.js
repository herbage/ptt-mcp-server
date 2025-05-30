import { describe, test, expect } from '@jest/globals';
import { PTTMCPServer as RefactoredServer, DateUtils, PTTUtils } from '../index.js';

describe('Refactored Utility Functions', () => {
  test('utility methods should work correctly', () => {
    // Test parsePushCount
    expect(PTTUtils.parsePushCount('10')).toBe(10);
    expect(PTTUtils.parsePushCount('爆')).toBe(100);
    expect(PTTUtils.parsePushCount('X5')).toBe(-10);
    expect(PTTUtils.parsePushCount('')).toBe(0);
    
    // Test parseFlexibleDate
    const date1 = DateUtils.parseFlexibleDate('5/25');
    expect(date1?.getMonth()).toBe(4); // May (0-indexed)
    expect(date1?.getDate()).toBe(25);
    
    const date2 = DateUtils.parseFlexibleDate('2025-05-25');
    expect(date2?.getFullYear()).toBe(2025);
    expect(date2?.getMonth()).toBe(4);
    expect(date2?.getDate()).toBe(25);
    
    // Test parsePTTDate
    const pttDate = DateUtils.parsePTTDate('5/25');
    expect(pttDate.getMonth()).toBe(4);
    expect(pttDate.getDate()).toBe(25);
    expect(pttDate.getHours()).toBe(23);
    
    // Test extractContentSummary
    const content = '這是一個比較長的測試內容應該會被摘要。這是第二句話也很長。第三句不會被包含。';
    const summary = PTTUtils.extractContentSummary(content);
    expect(summary).toContain('這是一個比較長的測試內容應該會被摘要');
    
    // Test extractMainOpinions
    const comments = [
      { type: '推', author: 'user1', content: '好', time: '01/01' },
      { type: '噓', author: 'user2', content: '不好', time: '01/01' },
      { type: '→', author: 'user3', content: '中性', time: '01/01' }
    ];
    expect(PTTUtils.extractMainOpinions(comments)).toBe('推 1 / 噓 1 / 中性 1');
    
    // Test calculatePopularity
    expect(PTTUtils.calculatePopularity(comments)).toBe('冷門');
    
    // Test encodePTTQuery
    expect(PTTUtils.encodePTTQuery('test query')).toBe('test+query');
  });

  test('refactored server should have proper structure', () => {
    const refactored = new RefactoredServer();
    
    // Should have server instance
    expect(refactored.server).toBeDefined();
    
    // Should have run method
    expect(typeof refactored.run).toBe('function');
    
    // Refactored should have organized structure
    expect(refactored.scraper).toBeDefined();
    expect(refactored.tools).toBeDefined();
  });

  test('date range filtering should work correctly', () => {
    const testCases = [
      ['5/25', '5/20', '5/30', false, true],
      ['5/15', '5/20', '5/30', false, false],
      ['6/1', '5/20', '5/30', false, false],
      ['1/1', null, null, false, true]
    ];
    
    testCases.forEach(([postDate, dateFrom, dateTo, onlyToday, expected]) => {
      const result = DateUtils.isPostInDateRange(postDate, dateFrom, dateTo, onlyToday);
      expect(result).toBe(expected);
    });
  });
});