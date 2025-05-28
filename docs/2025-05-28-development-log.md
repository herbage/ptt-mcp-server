# PTT MCP Server Development Log

## 2025-05-28: Complete Development Journey

This document chronicles the full development process from initial debugging to final feature implementation, including lessons learned and architectural decisions.

### Part 1: PTT Stock Posts 24h Function Debug

### Issue
The `get_stock_posts_24h` function in MCP server was unable to fetch post list properly when tested in inspector.

### Root Cause
Date parsing logic issue in `parsePTTDate()` function at `index.js:333-346`. The function was:
1. Parsing PTT dates (format: M/DD) to midnight (00:00:00) of that day
2. Comparing with current timestamp (e.g., 09:36:15)
3. Posts from the same day were incorrectly marked as "older than 24 hours"

### Example of the Problem
- Current time: `Wed May 28 2025 09:36:15`
- 24 hours ago: `Tue May 27 2025 09:36:15`
- Post date "5/27" parsed as: `Tue May 27 2025 00:00:00`
- Result: 00:00:00 < 09:36:15 (from previous day) = excluded incorrectly

### Solution
Changed the date parsing to set parsed dates to end of day (23:59:59) instead of start of day (00:00:00):

```javascript
// Before (problematic)
return new Date(currentYear, month, day);

// After (fixed)
return new Date(currentYear, month, day, 23, 59, 59);
```

### Debugging Steps Taken
1. ✅ **Test basic fetch functionality** - Confirmed PTT website was accessible and returning data
2. ✅ **Check HTML structure and CSS selectors** - Verified `.r-ent` elements and data extraction worked correctly
3. ✅ **Debug date parsing logic** - Identified the core issue with timestamp comparison
4. ✅ **Test complete function** - Verified fix works end-to-end

### Key Insights
- When dealing with date-only data (no time component), be generous with time boundaries
- PTT posts only show date (M/DD), not time, so need to account for this in comparisons
- Always test date boundary conditions when working with time-based filtering
- Use end-of-day timestamps for inclusive date ranges

### Files Modified
- `index.js:345` - Updated `parsePTTDate()` method

### Testing Approach
Created isolated test scripts to debug each component separately:
1. Basic fetch test
2. HTML parsing test  
3. Date parsing logic test
4. End-to-end function test

### Result
Function now successfully returns posts from past 24 hours with proper data structure including title, author, date, URL, and push count.

---

### Part 2: Multi-Board Support Extension

### Objective
Extend the PTT MCP server to support multiple boards (Baseball, Gossiping, HatePolitics, etc.) instead of just Stock board.

### Research Findings
1. **URL Pattern**: All PTT boards follow the same URL structure: `https://www.ptt.cc/bbs/{BoardName}/index.html`
2. **HTML Structure**: All boards use identical HTML structure (`.r-ent` elements, same CSS selectors)
3. **Special Considerations**: 
   - Some boards require age verification (over18=1 cookie)
   - Board names are case-sensitive (e.g., "HatePolitics" not "Hate_Politics")

### Refactoring Approach
1. **Class Rename**: `PTTStockMCPServer` → `PTTMCPServer`
2. **Function Rename**: `get_stock_posts_24h` → `get_board_posts_24h`
3. **URL Parameterization**: Replace hardcoded Stock URL with board parameter
4. **Validation**: Add board name validation to prevent invalid requests
5. **New Tool**: Add `list_popular_boards` to show available boards

### Key Code Changes
```javascript
// Before (hardcoded)
this.PTT_STOCK_URL = 'https://www.ptt.cc/bbs/Stock/index.html';

// After (parameterized)
this.PTT_BASE_URL = 'https://www.ptt.cc/bbs';
let currentUrl = `${this.PTT_BASE_URL}/${board}/index.html`;
```

### Board Validation Strategy
- Maintain whitelist of 19 popular boards
- Return clear error message for invalid boards
- Provide `list_popular_boards` tool for discovery

### Testing Results
✅ Successfully tested on multiple boards:
- Stock: ✅ 3 posts found
- Baseball: ✅ 3 posts found  
- NBA: ✅ 3 posts found
- Tech_Job: ✅ 3 posts found
- Movie: ✅ 3 posts found

### Architecture Decisions
1. **Backward Compatibility**: Default board parameter to "Stock"
2. **Error Handling**: Graceful failure for invalid boards
3. **Export Support**: Made class exportable for testing
4. **Conditional Startup**: Only start server when run directly

### Testing Strategy
1. **Unit Testing**: Isolated testing of each component
2. **Integration Testing**: End-to-end testing with real PTT requests
3. **Board Coverage**: Tested multiple board types (sports, tech, entertainment)
4. **Error Cases**: Validated error handling for invalid boards

### Files Modified
- `index.js`: Complete refactor for multi-board support
- `README.md`: Updated documentation with new features
- `package.json`: Updated name and description

### Lessons Learned
1. **API Design**: Adding optional parameters with defaults maintains compatibility
2. **Validation**: Input validation prevents confusing error messages
3. **Testing**: Separate test files make debugging much easier
4. **Documentation**: Keep examples current with API changes
5. **Modularity**: Extracting validation logic makes code more maintainable

### Performance Considerations
- Added 1-second delay between board requests during testing
- Limited pagination to prevent server overload
- Maintained existing request throttling mechanisms

---

### Part 3: 24-Hour Pagination Fix

### Issue Discovered
The 24-hour filtering logic was unreliable because PTT pagination isn't strictly chronological. Different pages (e.g., index.html, index39106.html) showed posts from the same date, making time-based filtering inconsistent.

### Investigation Results
```
https://www.ptt.cc/bbs/Gossiping/index.html      → All posts from 5/28
https://www.ptt.cc/bbs/Gossiping/index39106.html → All posts from 5/28  
https://www.ptt.cc/bbs/Gossiping/index39105.html → All posts from 5/28
```

### Root Cause
PTT post ordering is based on sequential post IDs, not strict chronological order. Posts across multiple pages can have the same date, making "24 hours ago" filtering unreliable.

### Solution: Simple Recent Posts Approach
Replaced complex 24-hour logic with straightforward "recent X posts":

**Before (24h filtering):**
```javascript
const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
if (postDate < twentyFourHoursAgo) {
  foundOldPost = true;
  break;
}
```

**After (simple limit):**
```javascript
const actualLimit = Math.min(Math.max(1, limit), maxLimit);
// Simply collect posts until we reach the limit
if (posts.length >= actualLimit) break;
```

### Improvements Made
1. **Reliability**: No more date-based edge cases
2. **Predictability**: Users get exactly what they request
3. **Efficiency**: Dynamic pagination based on requested limit
4. **Validation**: Proper limit bounds (1-200 posts)
5. **Filtering**: Skip deleted posts automatically

### API Changes
- `get_board_posts_24h` → `get_recent_posts`
- Updated documentation and examples
- Added limit validation (max 200)
- Clearer success messages

### Testing Results
✅ All limits work correctly (1, 15, 50, 200)
✅ Multiple boards tested successfully  
✅ Deleted posts properly filtered
✅ Performance scales with requested limit

### Lessons Learned
1. **KISS Principle**: Simple solutions are often more reliable than complex ones
2. **External Dependencies**: Don't rely on external system behaviors (PTT's ordering)
3. **User Expectations**: "Recent 20 posts" is clearer than "24 hours"
4. **Input Validation**: Always validate and bound user inputs
5. **Performance Scaling**: Adjust resource usage based on request size

### Files Modified
- `index.js`: Complete function refactor
- `README.md`: Updated API documentation and examples
- `docs/2025-05-28-development-log.md`: This documentation

---

### Part 4: Push Count Filtering Feature

### Objective
Add optional parameters to filter posts by push count (more than or less than X) to enable users to find hot posts, cold posts, or posts within specific engagement ranges.

### Feature Design
Chose range filtering approach with two optional parameters:
- `minPushCount`: Filter posts with >= X pushes
- `maxPushCount`: Filter posts with <= X pushes

### Implementation Highlights
1. **Parameter Validation**: Comprehensive bounds checking (-100 to 200)
2. **Logical Validation**: Ensure min <= max when both provided
3. **Dynamic Pagination**: Adjust page limits when filtering is active
4. **Clear Messaging**: Result messages show applied filter criteria

### Use Cases Enabled
- **Hot Posts**: `minPushCount: 30` for high engagement content
- **Cold Posts**: `maxPushCount: 5` for low engagement content  
- **Range Filtering**: `minPushCount: 10, maxPushCount: 50` for moderate engagement
- **Controversial Posts**: Negative push counts for controversial content

### Testing Results
```
✅ Hot posts filter (>= 20): 10 posts found, all valid
✅ Cold posts filter (<= 5): 10 posts found, all valid  
✅ Range filter (10-30): 10 posts found, all valid
✅ Error validation: All invalid inputs properly rejected
```

### Technical Considerations
- Applied filtering during collection loop for efficiency
- Increased max pages when filtering to ensure sufficient candidates
- Maintained existing push count parsing logic ("爆" = 100, "X1" = -10, etc.)

### API Examples
```json
// Hot posts only
{"board": "Stock", "minPushCount": 30}

// Cold posts only  
{"board": "NBA", "maxPushCount": 5}

// Moderate engagement range
{"board": "Baseball", "minPushCount": 10, "maxPushCount": 50}
```

### Files Modified
- `index.js`: Added filtering parameters and logic
- `README.md`: Updated documentation with examples
- Tool schema: Added minPushCount and maxPushCount parameters

### Development Timeline Summary
1. **Initial Debug**: Fixed 24-hour pagination issues
2. **Multi-Board Extension**: Added support for 19 popular boards
3. **Pagination Refactor**: Replaced unreliable 24h logic with recent posts
4. **Push Filtering**: Added flexible engagement-based filtering

### Total Features Delivered
- ✅ Multi-board support (19 boards)
- ✅ Reliable recent posts fetching
- ✅ Board validation and discovery
- ✅ Push count filtering (min/max/range)
- ✅ Comprehensive error handling
- ✅ Dynamic pagination optimization
- ✅ Complete documentation and examples