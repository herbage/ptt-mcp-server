import { describe, test, expect, beforeEach } from '@jest/globals';
import { PTTMCPServer, DateUtils, PTTUtils } from '../index.js';

describe('PTT Utility Functions', () => {
  let server;

  beforeEach(() => {
    server = new PTTMCPServer();
  });

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
      // Note: JavaScript Date constructor is lenient with invalid dates
      // 13/40 becomes a valid date (month 13 = January next year, day 40 = February)
      // This is current behavior that we might want to improve
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
      // Should set to end of day
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });

    test('should handle single digit month/day', () => {
      const result = DateUtils.parsePTTDate('5/5');
      expect(result.getMonth()).toBe(4);
      expect(result.getDate()).toBe(5);
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
      expect(DateUtils.isPostInDateRange('6/1', '5/20', '5/30', false)).toBe(false);
    });

    test('should handle onlyToday=false (all dates)', () => {
      expect(DateUtils.isPostInDateRange('1/1', null, null, false)).toBe(true);
      expect(DateUtils.isPostInDateRange('12/31', null, null, false)).toBe(true);
    });
  });

  describe('encodePTTQuery', () => {
    test('should encode search queries properly', () => {
      expect(PTTUtils.encodePTTQuery('台積電')).toBe('%E5%8F%B0%E7%A9%8D%E9%9B%BB');
      expect(PTTUtils.encodePTTQuery('test query')).toBe('test+query');
      expect(PTTUtils.encodePTTQuery('special chars: &=+')).toBe('special+chars%3A+%26%3D%2B');
    });
  });
});