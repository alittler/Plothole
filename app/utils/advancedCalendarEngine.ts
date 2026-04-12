/**
 * Advanced Calendar Projection Engine
 * Fulfills the architectural requirements for deep historical time handling,
 * Julian/Gregorian shifts, and the 13-Month International Fixed Calendar.
 */

export interface CalendarDate {
  year: number; // Astronomical Year (1 BCE = 0, 2 BCE = -1)
  month: number;
  day: number;
  isIntercalary?: boolean;
  type?: 'LeapDay' | 'YearDay' | 'Standard';
  era?: 'CE' | 'BCE' | string;
}

export class AdvancedCalendarEngine {
  
  // ============================================================================
  // 1. CORE ABSOLUTE TIME (JULIAN DATE)
  // The absolute truth representation. Uses Fliegel & Van Flandern algorithms.
  // ============================================================================

  /**
   * Convert Proleptic Gregorian date to Julian Date (JD)
   */
  static gregorianToJD(year: number, month: number, day: number): number {
    let y = year;
    let m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const a = Math.floor(y / 100);
    const b = 2 - a + Math.floor(a / 4);
    
    // JD calculation at 12:00 UT (noon)
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
  }

  /**
   * Convert Julian Date (JD) to Proleptic Gregorian CalendarDate
   */
  static jdToGregorian(jd: number): CalendarDate {
    const z = Math.floor(jd + 0.5);
    const w = Math.floor((z - 1867216.25) / 36524.25);
    const x = Math.floor(w / 4);
    const a = z + 1 + w - x;
    const b = a + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);
    
    const day = Math.floor(b - d - Math.floor(30.6001 * e));
    const month = e < 14 ? e - 1 : e - 13;
    const year = month > 2 ? c - 4716 : c - 4715;
    
    return { year, month, day, type: 'Standard', era: year > 0 ? 'CE' : 'BCE' };
  }

  // ============================================================================
  // 2. THE JULIAN CALENDAR & LOCALIZED HISTORICAL SHIFTS
  // ============================================================================

  static julianToJD(year: number, month: number, day: number): number {
    let y = year;
    let m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day - 1524.5;
  }

  static jdToJulian(jd: number): CalendarDate {
    const a = Math.floor(jd + 0.5);
    const b = a + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);
    
    const day = Math.floor(b - d - Math.floor(30.6001 * e));
    const month = e < 14 ? e - 1 : e - 13;
    const year = month > 2 ? c - 4716 : c - 4715;

    return { year, month, day, type: 'Standard', era: year > 0 ? 'CE' : 'BCE' };
  }

  /**
   * Projects JD based on Great Britain's historical shift in 1752.
   * Sept 2, 1752 (Julian) was followed by Sept 14, 1752 (Gregorian).
   */
  static jdToHistoricalUK(jd: number): CalendarDate {
    // Sept 14, 1752 Gregorian = JD 2361222.5
    const ukShiftJD = 2361222.5; 
    if (jd < ukShiftJD) {
      return this.jdToJulian(jd);
    }
    return this.jdToGregorian(jd);
  }

  // ============================================================================
  // 3. 13-MONTH INTERNATIONAL FIXED CALENDAR (IFC)
  // Exactly 13 months of 28 days each. Plus Intercalary Year Day / Leap Day.
  // ============================================================================

  static isGregorianLeapYear(year: number): boolean {
     return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Projects a Julian Date to the 13-Month International Fixed Calendar.
   */
  static jdTo13Month(jd: number): CalendarDate {
    const greg = this.jdToGregorian(jd);
    const isLeap = this.isGregorianLeapYear(greg.year);
    
    const startOfYearJD = this.gregorianToJD(greg.year, 1, 1);
    const dayOfYear = Math.floor(jd - startOfYearJD) + 1;

    // IFC inserts Leap Day after June 28th (which is Day 168 of the year)
    // So Day 169 in a leap year is the Intercalary Leap Day.
    if (isLeap && dayOfYear === 169) {
      return { year: greg.year, month: 6, day: 29, isIntercalary: true, type: 'LeapDay', era: greg.era };
    }
    
    // Shift calculations for days after the leap day anomaly
    let adjustedDayOfYear = dayOfYear;
    if (isLeap && dayOfYear > 169) {
        adjustedDayOfYear -= 1; 
    }

    // The 365th day of any year is Year Day
    if (adjustedDayOfYear === 365) {
      return { year: greg.year, month: 13, day: 29, isIntercalary: true, type: 'YearDay', era: greg.era };
    }

    // Standard 28-day month calculation
    const month = Math.floor((adjustedDayOfYear - 1) / 28) + 1;
    const day = ((adjustedDayOfYear - 1) % 28) + 1;

    return { year: greg.year, month, day, type: 'Standard', era: greg.era };
  }

  // ============================================================================
  // 4. ERAS AND DEEP HISTORY FORMATTING
  // ============================================================================

  /**
   * Converts Astronomical Year Numbering (0, -1, -2) to standard BCE/CE notation.
   */
  static formatDisplayYear(astronomicalYear: number): string {
    if (astronomicalYear <= 0) {
      return `${Math.abs(astronomicalYear) + 1} BCE`;
    }
    return `${astronomicalYear} CE`;
  }

  /**
   * Helper to format a CalendarDate object cleanly, handling intercalary quirks.
   */
  static formatCalendarDate(date: CalendarDate, monthNames: string[]): string {
    const yearStr = this.formatDisplayYear(date.year);
    
    if (date.isIntercalary) {
      if (date.type === 'YearDay') return `Year Day, ${yearStr}`;
      if (date.type === 'LeapDay') return `Leap Day, ${yearStr}`;
    }

    const monthName = monthNames[date.month - 1] || `Month ${date.month}`;
    return `${date.day} ${monthName}, ${yearStr}`;
  }
}
