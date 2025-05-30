export class DateUtils {
  static parseFlexibleDate(dateStr) {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (!dateStr) return null;
    
    if (dateStr === 'today') {
      return new Date(currentYear, now.getMonth(), now.getDate());
    }
    if (dateStr === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return new Date(currentYear, yesterday.getMonth(), yesterday.getDate());
    }
    
    const pttMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (pttMatch) {
      const month = parseInt(pttMatch[1]) - 1;
      const day = parseInt(pttMatch[2]);
      return new Date(currentYear, month, day);
    }
    
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1;
      const day = parseInt(isoMatch[3]);
      return new Date(year, month, day);
    }
    
    return null;
  }

  static parsePTTDate(dateStr) {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
    if (!match) return new Date(0);

    const month = parseInt(match[1]) - 1;
    const day = parseInt(match[2]);
    
    return new Date(currentYear, month, day, 23, 59, 59);
  }

  static isPostInDateRange(postDateStr, dateFrom, dateTo, onlyToday) {
    const postDate = this.parsePTTDate(postDateStr);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? this.parseFlexibleDate(dateFrom) : new Date(1900, 0, 1);
      const toDate = dateTo ? this.parseFlexibleDate(dateTo) : new Date(2100, 11, 31);
      
      if (!fromDate || !toDate) return false;
      
      toDate.setHours(23, 59, 59, 999);
      
      return postDate >= fromDate && postDate <= toDate;
    }
    
    if (onlyToday !== false) {
      return postDate.toDateString() === todayStart.toDateString();
    }
    
    return true;
  }
}