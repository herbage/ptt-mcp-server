# Debugging Lessons Learned

## 2025-05-28: PTT Stock Posts 24h Function Debug

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