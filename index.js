#!/usr/bin/env node

import { PTTMCPServer } from './src/ptt-mcp-server.js';

// Export for testing
export { PTTMCPServer };

// Export legacy classes for backward compatibility
export { PTTScraper } from './src/parsers/ptt-scraper.js';
export { DateUtils } from './src/utils/date-utils.js';
export { PTTUtils } from './src/utils/ptt-utils.js';

// Start server (only if running directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new PTTMCPServer();
  server.run().catch(console.error);
}