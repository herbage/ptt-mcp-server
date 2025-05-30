import { describe, test, expect, beforeEach } from '@jest/globals';
import { PTTMCPServer } from '../index.js';

describe('Refactored PTTMCPServer', () => {
  let server;

  beforeEach(() => {
    server = new PTTMCPServer();
  });

  test('should initialize with proper structure', () => {
    expect(server).toBeDefined();
    expect(server.server).toBeDefined();
    expect(server.scraper).toBeDefined();
    expect(server.tools).toBeDefined();
  });

  test('should have all required tools', () => {
    expect(server.tools.listPosts).toBeDefined();
    expect(server.tools.postDetail).toBeDefined();
    expect(server.tools.searchPosts).toBeDefined();
    expect(server.tools.searchThread).toBeDefined();
    expect(server.tools.listBoards).toBeDefined();
    expect(server.tools.summarizePosts).toBeDefined();
  });

  test('should have scraper with proper methods', () => {
    expect(server.scraper.fetchWithCookies).toBeDefined();
    expect(server.scraper.isValidBoard).toBeDefined();
    expect(server.scraper.scrapePostList).toBeDefined();
    expect(server.scraper.scrapePostDetail).toBeDefined();
  });

  test('should configure MCP server correctly', () => {
    // The server configuration is internal to the MCP SDK
    // We can test that the server exists and has the proper structure
    expect(server.server).toBeDefined();
    expect(typeof server.run).toBe('function');
  });
});