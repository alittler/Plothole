import { CalendarConfig } from '../types';

export const getMoonEmoji = (phase: number): string => {
  if (phase < 0.05 || phase > 0.95) return '🌑';
  if (phase < 0.2) return '🌒';
  if (phase < 0.3) return '🌓';
  if (phase < 0.45) return '🌔';
  if (phase < 0.55) return '🌕';
  if (phase < 0.65) return '🌖';
  if (phase < 0.8) return '🌗';
  return '🌘';
};

export interface CalendarPreset {
  config: Partial<CalendarConfig>;
  description: string;
}

export const calendarPresets: Record<string, CalendarPreset> = {
  Gregorian: {
    config: {
      year_len: 365,
      n_months: 12,
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      month_len: { "January": 31, "February": 28, "March": 31, "April": 30, "May": 31, "June": 30, "July": 31, "August": 31, "September": 30, "October": 31, "November": 30, "December": 31 },
      week_len: 7,
      weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      n_moons: 1,
      moons: ["Luna"],
      lunar_cyc: { "Luna": 29.53 },
      lunar_shf: { "Luna": 0 },
      first_day: 4 
    },
    description: "The Gregorian calendar is the internationally accepted civil calendar, based on Earth's orbit around the Sun."
  },
  HarmonicAccord: {
    config: {
      year_len: 365,
      n_months: 14,
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "Sol", "YearDay"],
      month_len: Object.fromEntries(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "Sol", "YearDay"].map(m => [m, m === "YearDay" ? 1 : 28])),
      week_len: 7,
      weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      n_moons: 1,
      moons: ["Luna"],
      lunar_cyc: { "Luna": 29.53 },
      lunar_shf: { "Luna": 0 },
      first_day: 0
    },
    description: "The Harmonic Accord, or International Fantasy Standard, divides the year into 13 months of exactly 28 days each, followed by a single 'YearDay' of reflection, ensuring temporal harmony where every month starts on the same weekday."
  }
};

export const calculateMoonPhase = (dayOfYear: number, moonName: string, config: CalendarConfig): number => {
  const cycle = config.lunar_cyc[moonName] || 29.53;
  const shift = config.lunar_shf[moonName] || 0;
  return ((dayOfYear + shift) % cycle) / cycle;
};

export const getDateKey = (monthIndex: number, day: number): string => {
  return `${monthIndex + 1}-${day}`;
};

export const parseDateKey = (dateKey: string): { month: number; day: number } => {
  const [month, day] = dateKey.split('-').map(Number);
  return { month, day };
};
