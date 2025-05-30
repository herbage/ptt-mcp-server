# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Run the MCP server
- `npm run dev` - Run the server with file watching for development
- `npm install` - Install dependencies
- `npm test` - Run comprehensive test suite (51 tests)

## Architecture Overview

This is a Model Context Protocol (MCP) server for scraping PTT (Taiwan's largest bulletin board system) board posts. The server uses a modular architecture with separated concerns and comprehensive test coverage.

### Core Components

**Modular Architecture:**
- `index.js` - Main entry point and exports
- `src/ptt-mcp-server.js` - MCP server coordination
- `src/parsers/ptt-scraper.js` - Web scraping logic
- `src/utils/date-utils.js` - Date parsing and validation
- `src/utils/ptt-utils.js` - PTT-specific utilities
- `src/tools/` - Individual MCP tool implementations

**PTTMCPServer Class** (src/ptt-mcp-server.js)
- Main server class implementing MCP protocol
- Uses `@modelcontextprotocol/sdk` for MCP communication
- Coordinates 6 different tools for PTT data extraction

**Key Tools Available:**
1. `get_recent_posts` - Fetch recent posts from PTT boards with filtering
2. `get_post_detail` - Get detailed post content including comments
3. `search_thread_posts` - Search for posts with same title (thread search)
4. `search_posts` - General search (keyword, title, author)
5. `summarize_posts` - Analyze and summarize post content and sentiment
6. `list_popular_boards` - List supported PTT boards

### Data Flow

1. **Web Scraping**: Uses `node-fetch` and `cheerio` to scrape PTT HTML
2. **Data Parsing**: Extracts post metadata (title, author, date, push count) and content
3. **Filtering**: Supports multiple filter types (date ranges, push counts, keywords)
4. **MCP Response**: Returns structured JSON responses via MCP protocol

### PTT-Specific Logic

**Dynamic Board Validation** (index.js:906-949)
- Dynamic validation by checking board existence via HTTP requests
- Caching mechanism for validated boards (1 hour for valid, 10 minutes for invalid)
- Fallback to hardcoded popular boards list on network errors
- Supports any public PTT board, not limited to predefined list

**Date Handling** (index.js:440-502)
- Flexible date parsing supporting both `M/DD` (PTT native) and `YYYY-MM-DD` formats
- Intelligent date range filtering with 14-day lookback limit for efficiency

**Push Count Parsing** (index.js:866-871)
- Handles PTT's special push count notation ("爆" = 100, "X" = negative)
- Supports push count range filtering for finding hot/cold posts

**Search Implementation** (index.js:593-740)
- Multiple search types: keyword (full-text), title, author
- Proper URL encoding for PTT search queries
- Pagination handling for large result sets

### Key Features

**Smart Filtering System**
- Date range filtering with hybrid approach (recent posts + search for older content)
- Push count filtering for popularity-based post discovery
- Title keyword filtering for topic-specific searches
- Combines multiple filters efficiently

**Error Handling**
- Comprehensive input validation for all parameters
- PTT-specific error handling (deleted posts, invalid boards)
- Graceful degradation when PTT is unavailable

**Performance Optimizations**
- Intelligent pagination limits based on filter complexity
- Caching-friendly design with consistent URL patterns
- Efficient post filtering to minimize unnecessary requests

## Working with This Codebase

### Modular Structure
- **Utilities**: Use `DateUtils` and `PTTUtils` classes for common operations
- **Scraping**: `PTTScraper` handles all web scraping and HTML parsing
- **Tools**: Each MCP tool is a separate class in `src/tools/`
- **Testing**: 51 comprehensive tests ensure code quality

### Board Validation System
The `PTTScraper.isValidBoard()` method dynamically validates boards by making HTTP requests to PTT. No need to manually add new boards - the system supports any public PTT board automatically.

### Modifying Search Logic
Search functionality is in individual tool classes (`SearchPostsTool`, `SearchThreadTool`). PTT search uses specific URL query parameters that may need adjustment if PTT changes their search interface.

### Date Filtering
Date parsing logic is in `DateUtils.parseFlexibleDate()` and `DateUtils.isPostInDateRange()`. PTT uses Taiwan timezone and M/DD format natively.

### Adding New Tools
1. Create new tool class in `src/tools/`
2. Add to tool initialization in `src/ptt-mcp-server.js`
3. Add to schema handlers for both list and call operations
4. Write tests for the new tool

## PTT-Specific Considerations

- PTT requires `over18=1` cookie for age verification
- Post URLs follow pattern: `https://www.ptt.cc/bbs/{BOARD}/M.{timestamp}.A.{id}.html`
- Push counts use special notation that requires custom parsing
- Deleted posts show as "(本文已被刪除)" and should be filtered out
- PTT search has rate limiting - avoid excessive concurrent requests

## Testing Approach

Comprehensive test suite with 51 tests covering:
1. **Unit tests** for utility functions (`DateUtils`, `PTTUtils`)
2. **Integration tests** for data parsing methods
3. **Server tests** for MCP server initialization
4. **Backward compatibility tests** ensuring refactored code works identically to original

Run tests with:
- `npm test` - Run all 51 tests
- Manual testing via MCP client or Claude Desktop
- Validate against different PTT boards and date ranges

The server includes extensive error handling and input validation to catch issues early.