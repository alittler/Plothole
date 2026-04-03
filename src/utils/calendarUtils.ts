import { CalendarSystem } from '../types';
export { AdvancedCalendarEngine, type CalendarDate } from './advancedCalendarEngine';

export const calculateDaysInYear = (months: CalendarMonth[]): number => {
  return months.reduce((acc, m) => acc + m.days, 0);
};

export const calculateUEI = (calendar: CalendarSystem, year: number, monthIndex: number, day: number): number => {
  const daysInYear = calculateDaysInYear(calendar.months);
  
  // Assuming year starts at 1, so we calculate full years passed
  const yearsPassed = Math.max(0, year - 1);
  const daysFromYears = yearsPassed * daysInYear;
  
  let daysFromMonths = 0;
  for (let i = 0; i < monthIndex && i < calendar.months.length; i++) {
    daysFromMonths += calendar.months[i].days;
  }
  
  // Assuming day starts at 1
  return daysFromYears + daysFromMonths + (day - 1);
};

export const getDateFromUEI = (calendar: CalendarSystem, uei: number) => {
  const daysInYear = calculateDaysInYear(calendar.months);
  if (daysInYear === 0) return { year: 1, monthIndex: 0, day: 1 };

  const year = Math.floor(uei / daysInYear) + 1;
  let remainingDays = uei % daysInYear;

  let monthIndex = 0;
  for (let i = 0; i < calendar.months.length; i++) {
    if (remainingDays < calendar.months[i].days) {
      monthIndex = i;
      break;
    }
    remainingDays -= calendar.months[i].days;
  }

  const day = remainingDays + 1;

  return { year, monthIndex, day };
};

export const formatUEI = (calendar: CalendarSystem, uei: number): string => {
  const date = getDateFromUEI(calendar, uei);
  const monthName = calendar.months[date.monthIndex]?.name || `Month ${date.monthIndex + 1}`;
  
  // Optionally find the active era based on the year (simplified to just use the first era for display if needed, or simply append "Year X")
  const era = calendar.eras.length > 0 ? calendar.eras[0].abbreviation : '';

  return `${date.day}${getOrdinalSuffix(date.day)} of ${monthName}, Year ${date.year} ${era}`.trim();
};

const getOrdinalSuffix = (i: number) => {
    let j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return "st";
    }
    if (j == 2 && k != 12) {
        return "nd";
    }
    if (j == 3 && k != 13) {
        return "rd";
    }
    return "th";
};

// Check if a parsed date is valid within the active cosmology
export const isValidDate = (calendar: CalendarSystem, year: number, monthIndex: number, day: number): boolean => {
  if (year < 1) return false;
  if (monthIndex < 0 || monthIndex >= calendar.months.length) return false;
  
  const month = calendar.months[monthIndex];
  if (day < 1 || day > month.days) return false;

  return true;
};

// Attempt to parse a string date into a UEI for sorting
export const parseDateToUEI = (calendar: CalendarSystem, dateStr: string): number | null => {
  if (!dateStr) return null;
  const normalized = dateStr.toLowerCase().trim();
  
  // 1. Try ISO-8601 (YYYY-MM-DD)
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]);
    const day = parseInt(isoMatch[3]);
    return calculateUEI(calendar, year, month - 1, day);
  }

  // 2. Extract Year
  let year = 1;
  const yearMatch = normalized.match(/year[:\s]+(\d+)/i) || normalized.match(/yr\s*(\d+)/i) || normalized.match(/\b(\d{3,4})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  }

  // 3. Extract Month
  let monthIndex = 0;
  calendar.months.forEach((m, idx) => {
    if (normalized.includes(m.name.toLowerCase())) {
      monthIndex = idx;
    }
  });

  // 4. Extract Day
  let day = 1;
  const dayMatch = normalized.match(/(\d+)(st|nd|rd|th)?\s+of/i) || normalized.match(/day\s+(\d+)/i) || normalized.match(/(\d+)\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
  if (dayMatch) {
    // dayMatch[1] or dayMatch[2] depending on which regex hit
    const val = dayMatch[1] || dayMatch[2];
    if (val) day = parseInt(val);
  }

  // 5. Special Case: "Day X" relative to start of time
  if (normalized.match(/^day\s+(\d+)$/i)) {
    return parseInt(normalized.match(/\d+/)?.[0] || '0') - 1;
  }

  // If we found at least a year or month, return calculated UEI
  if (yearMatch || monthIndex > 0 || normalized.includes(calendar.months[0].name.toLowerCase())) {
    return calculateUEI(calendar, year, monthIndex, day);
  }

  return null;
};

export const detectTemporalParadoxes = (projectData: any): { id: string; type: string; message: string }[] => {
  const paradoxes: { id: string; type: string; message: string }[] = [];
  const calendar = projectData.calendars?.find((c: any) => c.id === projectData.activeCalendarId) || projectData.calendars?.[0];
  
  if (!calendar) return paradoxes;

  // Check Timeline Events for invalid UEIs or out-of-bounds dates
  (projectData.timeline || []).forEach((event: any) => {
    if (event.uei !== undefined) {
      const date = getDateFromUEI(calendar, event.uei);
      if (!isValidDate(calendar, date.year, date.monthIndex, date.day)) {
         paradoxes.push({ id: event.id, type: 'Timeline', message: `Paradox in '${event.title}': UEI ${event.uei} translates to an invalid date.` });
      }
    } else if (event.date) {
      // Basic string matching to check if a month is mentioned that doesn't exist
      const monthNames = calendar.months.map((m: any) => m.name.toLowerCase());
      const words = event.date.toLowerCase().split(/\s+/);
      
      let containsMonth = false;
      let validMonth = false;
      
      for (const word of words) {
         // rough check to see if word might be a month (needs more robust NLP for full parsing)
         const cleanWord = word.replace(/[^a-z]/g, '');
         if (cleanWord.length > 3) { // Assume month names are >3 chars for simplistic check
             if (monthNames.includes(cleanWord)) {
                 containsMonth = true;
                 validMonth = true;
                 break;
             }
         }
      }
      
      // If it looks like a formatted date but we couldn't match a valid month from cosmology
      if (event.date.includes('of') && !validMonth) {
         paradoxes.push({ id: event.id, type: 'Timeline', message: `Paradox in '${event.title}': '${event.date}' contains an unrecognized month.` });
      }
    }
  });

  return paradoxes;
};
