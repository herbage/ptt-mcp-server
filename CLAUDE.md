# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Run the MCP server
- `npm run dev` - Run the server with file watching for development
- `npm install` - Install dependencies
- `npm test` - Run tests (currently no tests defined)

## Architecture Overview

This is a Model Context Protocol (MCP) server for scraping PTT (Taiwan's largest bulletin board system) board posts. The server is built as a single-file Node.js application (`index.js`) using ES modules.

### Core Components

**PTTMCPServer Class** (index.js:32-973)
- Main server class implementing MCP protocol
- Uses `@modelcontextprotocol/sdk` for MCP communication
- Handles 6 different tools for PTT data extraction

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

**Supported Boards** (index.js:906-913)
- 19 popular PTT boards including Stock, Baseball, NBA, Tech_Job, etc.
- Board validation prevents invalid requests

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

### Adding New Board Support
Add board names to both `isValidBoard()` and `listPopularBoards()` methods.

### Modifying Search Logic
Search functionality is centralized in `searchPosts()` and `searchThreadPosts()` methods. PTT search uses specific URL query parameters that may need adjustment if PTT changes their search interface.

### Date Filtering Improvements
Date parsing logic is in `parseFlexibleDate()` and `isPostInDateRange()`. PTT uses Taiwan timezone and M/DD format natively.

### Adding New Tools
New MCP tools should be added to both the `ListToolsRequestSchema` handler (index.js:51-215) and `CallToolRequestSchema` handler (index.js:217-235).

## PTT-Specific Considerations

- PTT requires `over18=1` cookie for age verification
- Post URLs follow pattern: `https://www.ptt.cc/bbs/{BOARD}/M.{timestamp}.A.{id}.html`
- Push counts use special notation that requires custom parsing
- Deleted posts show as "(本文已被刪除)" and should be filtered out
- PTT search has rate limiting - avoid excessive concurrent requests

## Testing Approach

Currently no automated tests. Manual testing can be done by:
1. Running `npm run dev` to start server with file watching
2. Testing individual tools via MCP client or Claude Desktop
3. Validating against different PTT boards and date ranges

The server includes extensive error handling and input validation to catch issues early.