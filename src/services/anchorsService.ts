/**
 * Timeline Anchors Service
 * Handles YBP (Years Before Present) conversion and anchor-based date synchronization
 * 
 * YBP = Years Before Present (Present = 1950 AD standard)
 * Examples:
 *   10YBP = 1940 AD
 *   300YBP = 1650 AD
 *   1000YBP = 950 AD
 */

import { TimelineEvent } from '../types';

const PRESENT_YEAR = 1950; // Standard baseline for YBP
const DAYS_PER_YEAR = 365.25; // Average days per year for high-precision offsets

/**
 * Parse a date string and return a high-precision numeric value (days since Year 1, Day 0)
 * Supports formats: "XXXYAD", "XXYBP", "Year XXX", "XXX", "Month Day, Year", "Day Month Year"
 */
export const parseTimelineDate = (dateStr: string): number | null => {
  if (!dateStr) return null;
  
  const trimmed = dateStr.trim();
  const normalized = trimmed.toUpperCase();
  
  // 1. Try standard JS Date parsing for human-readable formats (e.g., "July 11, 1986")
  // We check if it looks like a human date first (contains letters that aren't just AD/YBP)
  const isHumanLikely = normalized.match(/[A-Z]{3,}/) && !normalized.includes('YBP') && !normalized.includes('AD');
  if (isHumanLikely) {
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      // Use the year from the parsed date directly as the "Timeline Year"
      const year = parsedDate.getFullYear();
      const month = parsedDate.getMonth();
      const day = parsedDate.getDate();
      
      // Calculate day of year (approximate is fine for this high-precision mapping)
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      let dayOfYear = day - 1; // 0-indexed for start of year
      for (let i = 0; i < month; i++) dayOfYear += daysInMonth[i];
      
      // Year 1 starts at 0 days
      return ((year - 1) * DAYS_PER_YEAR) + dayOfYear;
    }
  }

  // 2. Handle YBP format (e.g., "10YBP", "300YBP")
  const ybpMatch = normalized.match(/^(\d+)\s*YBP$/i);
  if (ybpMatch) {
    const ybp = parseInt(ybpMatch[1], 10);
    const year = PRESENT_YEAR - ybp;
    return (year - 1) * DAYS_PER_YEAR;
  }
  
  // 3. Handle AD format (e.g., "2010AD", "2010 AD")
  const adMatch = normalized.match(/^(\d+)\s*AD$/i);
  if (adMatch) {
    const year = parseInt(adMatch[1], 10);
    return (year - 1) * DAYS_PER_YEAR;
  }
  
  // 4. Handle "Year XXX" format
  const yearMatch = normalized.match(/YEAR\s+(\d+)/i);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return (year - 1) * DAYS_PER_YEAR;
  }
  
  // 5. Handle plain numbers (treated as years)
  const numMatch = normalized.match(/^(\d+)$/);
  if (numMatch) {
    const year = parseInt(numMatch[1], 10);
    return (year - 1) * DAYS_PER_YEAR;
  }
  
  return null;
};

/**
 * Convert a high-precision numeric value back to a formatted date string
 * Tries to preserve the "style" of the original if possible
 */
export const formatTimelineDate = (days: number, originalFormat?: string): string => {
  const normalizedOriginal = originalFormat?.toUpperCase() || '';
  const isYBP = normalizedOriginal.includes('YBP');
  const isAD = normalizedOriginal.includes('AD');
  const isHuman = originalFormat && originalFormat.match(/[a-zA-Z]{3,}/) && !isYBP && !isAD;

  // If original was a human date (contains month names)
  if (isHuman) {
    const year = Math.floor(days / DAYS_PER_YEAR) + 1;
    const dayOfYear = days % DAYS_PER_YEAR;
    
    // Reconstruct a date for formatting (Year 1 = 1 AD)
    // Date(year, 0, 1) is Jan 1st of that year
    const date = new Date(year, 0, 1);
    date.setDate(date.getDate() + Math.floor(dayOfYear));
    
    if (!isNaN(date.getTime())) {
      // Format as "Month Day, Year"
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }

  const year = Math.round(days / DAYS_PER_YEAR) + 1;
  
  if (isYBP) {
    const ybp = PRESENT_YEAR - year;
    return ybp >= 0 ? `${ybp}YBP` : (year < 1 ? `${Math.abs(year - 1)}BCE` : `${year}AD`);
  }
  
  return year < 1 ? `${Math.abs(year - 1)}BCE` : `${year}AD`;
};

/**
 * Convert an absolute "days since Year 1" value into year, month, and day for a specific calendar
 */
export const dateToCalendarInfo = (days: number, config: { year_len: number, months: string[], month_len: Record<string, number> }): { year: number, monthIndex: number, day: number } => {
  // Use the provided calendar configuration to determine the year
  const year = Math.floor(days / config.year_len) + 1;
  
  // Day of year (0-indexed)
  let dayOfYear = days % config.year_len;
  if (dayOfYear < 0) dayOfYear += config.year_len;
  
  // For custom calendars, map the remaining days to the custom month structure.
  let remainingDays = Math.floor(dayOfYear);
  let monthIndex = 0;
  
  for (let i = 0; i < config.months.length; i++) {
    const mName = config.months[i];
    const mLen = config.month_len[mName] || 30;
    
    if (remainingDays < mLen) {
      monthIndex = i;
      break;
    }
    
    remainingDays -= mLen;
    monthIndex = i;
  }
  
  return {
    year,
    monthIndex,
    day: remainingDays + 1
  };
};

/**
 * Parse a date string and return the numeric year
 * Supports formats: "XXXYAD", "XXYBP", "Year XXX", "XXX", "Month Day, Year", "Day Month Year"
 */
export const parseYear = (dateStr: string): number | null => {
  const days = parseTimelineDate(dateStr);
  if (days === null) return null;
  return Math.floor(days / DAYS_PER_YEAR) + 1;
};

/**
 * Convert a numeric year back to YBP format
 */
export const yearToYBP = (year: number): string => {
  const ybp = PRESENT_YEAR - year;
  if (ybp < 0) {
    // After present, show as AD
    return `${year}AD`;
  }
  return `${ybp}YBP`;
};

/**
 * Convert a numeric year to AD format
 */
export const yearToAD = (year: number): string => {
  return year < 0 ? `${Math.abs(year)}BCE` : `${year}AD`;
};

/**
 * Calculate the offset between two dates (in years)
 * Returns: targetYear - sourceYear
 */
export const calculateOffset = (sourceDate: string, targetDate: string): number | null => {
  const sourceYear = parseYear(sourceDate);
  const targetYear = parseYear(targetDate);
  
  if (sourceYear === null || targetYear === null) return null;
  
  return targetYear - sourceYear;
};

/**
 * Apply an offset to a date string
 * Used to recalculate relative dates when an anchor changes
 */
export const applyOffset = (dateStr: string, offsetYears: number): string | null => {
  const year = parseYear(dateStr);
  if (year === null) return null;
  
  const newYear = year + offsetYears;
  
  // Preserve the original format if possible
  if (dateStr.toUpperCase().includes('YBP')) {
    // Convert year to YBP (years before 1950)
    const ybp = PRESENT_YEAR - newYear;
    if (ybp >= 0) {
      return `${ybp}YBP`;
    } else {
      // After present, use AD format
      return `${newYear}AD`;
    }
  }
  
  // Default to AD format
  return yearToAD(newYear);
};

/**
 * Sync all timeline events based on an anchor event
 * 
 * Logic:
 * 1. The selected anchor event is moved to the new date.
 * 2. All other events marked with isSoftAnchor: true are considered "fixed" and do not move.
 * 3. All "unmarked" events (isSoftAnchor: false or undefined) are adjusted:
 *    - If an unmarked event is between two fixed anchors, its date is interpolated proportionally.
 *    - If an unmarked event is only bounded by one fixed anchor (e.g., at the start or end of the timeline),
 *      it is shifted by the offset applied to that nearest anchor.
 *    - Events with "Unknown Date" are treated as unmarked and given interpolated/shifted dates.
 * 
 * @param events - All timeline events
 * @param anchorEventId - The event to use as anchor reference
 * @param newAnchorDate - New date for the anchor event
 * @returns Updated timeline events
 */
export const syncTimelineByAnchor = (
  events: TimelineEvent[],
  anchorEventId: string,
  newAnchorDate: string
): TimelineEvent[] => {
  const selectedAnchorIndex = events.findIndex(e => e.id === anchorEventId);
  if (selectedAnchorIndex === -1) {
    console.warn('[syncTimelineByAnchor] Anchor event not found:', anchorEventId);
    return events;
  }
  
  const anchorEvent = events[selectedAnchorIndex];
  const oldAnchorDateStr = anchorEvent.startDate || anchorEvent.date;
  const oldAnchorTime = oldAnchorDateStr ? parseTimelineDate(oldAnchorDateStr) : null;
  const newAnchorTime = parseTimelineDate(newAnchorDate);
  
  if (newAnchorTime === null) {
    console.warn('[syncTimelineByAnchor] Could not parse new anchor date', newAnchorDate);
    return events;
  }

  // Calculate the offset for the selected anchor
  const anchorOffset = oldAnchorTime !== null ? newAnchorTime - oldAnchorTime : 0;

  console.log('[syncTimelineByAnchor] Processing sync with anchor:', anchorEvent.title, { 
    oldTime: oldAnchorTime, 
    newTime: newAnchorTime, 
    offset: anchorOffset 
  });

  // 1. Identify all "fixed" points. 
  const fixedPoints = events.map((event, index) => {
    const isSelected = index === selectedAnchorIndex;
    const dateStr = isSelected ? newAnchorDate : (event.startDate || event.date);
    const time = parseTimelineDate(dateStr || '');
    
    return {
      index,
      id: event.id,
      isFixed: isSelected || (event.isSoftAnchor && time !== null),
      time: isSelected ? newAnchorTime : time,
      originalTime: isSelected ? oldAnchorTime : time,
      title: event.title,
      originalFormat: dateStr
    };
  }).filter(p => p.isFixed && p.time !== null) as Array<{ index: number; id: string; time: number; originalTime: number | null; title: string; originalFormat: string }>;

  fixedPoints.sort((a, b) => a.index - b.index);

  // 2. Map all events, adjusting unmarked ones
  return events.map((event, index) => {
    if (index === selectedAnchorIndex) {
      return {
        ...event,
        ...(event.startDate ? { startDate: newAnchorDate } : { date: newAnchorDate })
      };
    }

    if (event.isSoftAnchor && parseTimelineDate(event.startDate || event.date || '') !== null) {
      return event;
    }

    const prevFixed = [...fixedPoints].reverse().find(p => p.index < index);
    const nextFixed = fixedPoints.find(p => p.index > index);

    const currentDateStr = event.startDate || event.date;
    const currentTime = currentDateStr ? parseTimelineDate(currentDateStr) : null;

    let targetTime: number | null = null;
    let formatToUse = currentDateStr || newAnchorDate;

    if (prevFixed && nextFixed) {
      // Interpolate
      const totalIndexGap = nextFixed.index - prevFixed.index;
      const myIndexGap = index - prevFixed.index;
      const timeGap = nextFixed.time - prevFixed.time;
      
      targetTime = prevFixed.time + (timeGap * (myIndexGap / totalIndexGap));
    } else if (prevFixed) {
      // Shift or Step
      const offsetToApply = prevFixed.originalTime !== null ? (prevFixed.time - prevFixed.originalTime) : 0;
      if (currentTime !== null) {
        targetTime = currentTime + offsetToApply;
      } else {
        // Step forward from previous anchor (1 unit per index)
        // If the anchor is a "human date" (July 11), 1 unit = 1 day
        // If it's a "year date" (2010), 1 unit = 1 year (DAYS_PER_YEAR)
        const isHumanDate = prevFixed.originalFormat.match(/[a-zA-Z]{3,}/);
        const unit = isHumanDate ? 1 : DAYS_PER_YEAR;
        targetTime = prevFixed.time + ((index - prevFixed.index) * unit);
      }
    } else if (nextFixed) {
      // Shift or Step
      const offsetToApply = nextFixed.originalTime !== null ? (nextFixed.time - nextFixed.originalTime) : 0;
      if (currentTime !== null) {
        targetTime = currentTime + offsetToApply;
      } else {
        // Step backward from next anchor
        const isHumanDate = nextFixed.originalFormat.match(/[a-zA-Z]{3,}/);
        const unit = isHumanDate ? 1 : DAYS_PER_YEAR;
        targetTime = nextFixed.time - ((nextFixed.index - index) * unit);
      }
    }

    if (targetTime !== null) {
      // Use the anchor's format if the current event has no specific format
      const bestFormat = (currentDateStr && currentDateStr !== 'Unknown Date') ? currentDateStr : newAnchorDate;
      const newDateStr = formatTimelineDate(targetTime, bestFormat);
      return {
        ...event,
        ...(event.startDate ? { startDate: newDateStr } : { date: newDateStr })
      };
    }

    return event;
  });
};

/**
 * Reset all unmarked events (non-anchors) to "Unknown Date"
 * 
 * @param events - All timeline events
 * @returns Updated timeline events with unmarked dates cleared
 */
export const resetUnmarkedToUnknown = (
  events: TimelineEvent[]
): TimelineEvent[] => {
  return events.map(event => {
    // If it's a soft anchor with a date, keep it
    if (event.isSoftAnchor && parseYear(event.startDate || event.date || '') !== null) {
      return event;
    }

    // Otherwise, clear the date
    return {
      ...event,
      date: 'Unknown Date',
      startDate: undefined,
      endDate: undefined
    };
  });
};

/**
 * Format a date string for display
 * Converts YBP to readable format like "300 years before present (1650 AD)"
 */
export const formatDateDisplay = (dateStr: string): string => {
  const time = parseTimelineDate(dateStr);
  if (time === null) return dateStr;
  
  if (dateStr.toUpperCase().includes('YBP')) {
    const year = Math.round(time / DAYS_PER_YEAR);
    const ybp = PRESENT_YEAR - year;
    return `${ybp} YBP (${year < 0 ? Math.abs(year) + ' BCE' : year + ' AD'})`;
  }
  
  return formatTimelineDate(time, dateStr);
};
