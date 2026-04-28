import { FantasyCalendarData, CalendarDate } from '../types';

/**
 * Fantasy Calendar Engine
 * Ported logic to support custom fantasy-calendar.com schemas.
 */
export class FantasyCalendarEngine {
  /**
   * Calculate the true length of a month for a specific year, including leap days.
   */
  static getMonthLength(data: FantasyCalendarData, monthId: number, year: number): number {
    const staticData = data.static_data;
    const month = staticData.months.find(m => Number(m.id) === monthId);
    if (!month) return 0;

    let length = month.length;

    // Check for leap days in this month for this year
    staticData.leap_days.forEach(leapDay => {
      if (Number(leapDay.month) === monthId) {
        if (this.isLeapYear(leapDay, year)) {
          length += 1;
        }
      }
    });

    return length;
  }

  /**
   * Determine if a year is a leap year based on custom leap day rules.
   */
  static isLeapYear(leapDay: any, year: number): boolean {
    const interval = Number(leapDay.interval);
    const offset = Number(leapDay.offset);
    
    // Simple interval check
    if ((year + offset) % interval === 0) {
      // Check for exceptions
      if (leapDay.not_interval) {
        if ((year + offset) % Number(leapDay.not_interval) === 0) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Calculate total days in a specific year.
   */
  static getDaysInYear(data: FantasyCalendarData, year: number): number {
    return data.static_data.months.reduce((acc, month) => {
      return acc + this.getMonthLength(data, Number(month.id), year);
    }, 0);
  }

  /**
   * Convert Fantasy Calendar Dynamic Data to a absolute Epoch (Day count from Year 1, Month 1, Day 1).
   */
  static calculateEpoch(data: FantasyCalendarData): number {
    let epoch = 0;
    const currentYear = data.dynamic_data.year;
    
    // Days in previous years
    for (let y = 1; y < currentYear; y++) {
      epoch += this.getDaysInYear(data, y);
    }

    // Days in previous months of current year
    for (let mIdx = 0; mIdx < data.static_data.months.length; mIdx++) {
      const month = data.static_data.months[mIdx];
      if (Number(month.id) === data.dynamic_data.month_id) break;
      epoch += this.getMonthLength(data, Number(month.id), currentYear);
    }

    // Days in current month
    epoch += (data.dynamic_data.day - 1);

    return epoch;
  }

  /**
   * Convert a raw Epoch back to Year, Month, Day.
   */
  static fromEpoch(data: FantasyCalendarData, epoch: number) {
    let remainingDays = epoch;
    let year = 1;

    // Find year
    while (true) {
      const daysInYear = this.getDaysInYear(data, year);
      if (remainingDays < daysInYear) break;
      remainingDays -= daysInYear;
      year++;
    }

    // Find month
    let monthId = data.static_data.months[0].id;
    for (const month of data.static_data.months) {
      const length = this.getMonthLength(data, Number(month.id), year);
      if (remainingDays < length) {
        monthId = month.id;
        break;
      }
      remainingDays -= length;
    }

    const day = remainingDays + 1;

    return { year, monthId: Number(monthId), day };
  }

  /**
   * Get the weekday name for a specific epoch.
   */
  static getWeekday(data: FantasyCalendarData, epoch: number): string {
    const weekdays = data.static_data.weekdays;
    if (weekdays.length === 0) return '';
    
    const index = epoch % weekdays.length;
    const weekday = weekdays[index];
    
    return typeof weekday === 'string' ? weekday : (weekday as any).name;
  }
}
