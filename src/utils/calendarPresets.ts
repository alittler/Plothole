import { CalendarSystem } from '../types';

export const CALENDAR_PRESETS: { [key: string]: CalendarSystem } = {
  gregorian: {
    id: 'gregorian-' + Math.random().toString(36).substring(7),
    name: 'Gregorian Calendar',
    type: 'standard',
    color: '#3B82F6',
    weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [
      { id: '1', name: 'January', days: 31 },
      { id: '2', name: 'February', days: 28 },
      { id: '3', name: 'March', days: 31 },
      { id: '4', name: 'April', days: 30 },
      { id: '5', name: 'May', days: 31 },
      { id: '6', name: 'June', days: 30 },
      { id: '7', name: 'July', days: 31 },
      { id: '8', name: 'August', days: 31 },
      { id: '9', name: 'September', days: 30 },
      { id: '10', name: 'October', days: 31 },
      { id: '11', name: 'November', days: 30 },
      { id: '12', name: 'December', days: 31 }
    ],
    eras: [{ id: '1', name: 'Common Era', abbreviation: 'CE', startYear: 0 }],
    currentEpochDay: 0,
    leapYearRule: { type: 'gregorian' },
    seasons: [
      { id: 's1', name: 'Winter', startMonth: 0, startDay: 21, endMonth: 2, endDay: 20, color: '#60A5FA' },
      { id: 's2', name: 'Spring', startMonth: 2, startDay: 21, endMonth: 5, endDay: 20, color: '#34D399' },
      { id: 's3', name: 'Summer', startMonth: 5, startDay: 21, endMonth: 8, endDay: 22, color: '#FBBF24' },
      { id: 's4', name: 'Autumn', startMonth: 8, startDay: 23, endMonth: 11, endDay: 20, color: '#F97316' }
    ]
  },

  chinese: {
    id: 'chinese-' + Math.random().toString(36).substring(7),
    name: 'Chinese Calendar',
    type: 'standard',
    color: '#DC2626',
    weekDays: ['一', '二', '三', '四', '五', '六', '日'],
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [
      { id: '1', name: '正月 (Zhēngyuè)', days: 29 },
      { id: '2', name: '二月 (Eryuè)', days: 30 },
      { id: '3', name: '三月 (Sānyuè)', days: 29 },
      { id: '4', name: '四月 (Sìyuè)', days: 30 },
      { id: '5', name: '五月 (Wǔyuè)', days: 29 },
      { id: '6', name: '六月 (Liùyuè)', days: 30 },
      { id: '7', name: '七月 (Qīyuè)', days: 29 },
      { id: '8', name: '八月 (Bāyuè)', days: 30 },
      { id: '9', name: '九月 (Jiǔyuè)', days: 29 },
      { id: '10', name: '十月 (Shíyuè)', days: 30 },
      { id: '11', name: '冬月 (Dōngyuè)', days: 29 },
      { id: '12', name: '腊月 (Làyuè)', days: 30 }
    ],
    eras: [{ id: '1', name: 'Lunar Year', abbreviation: 'LY', startYear: 0 }],
    currentEpochDay: 0,
    leapYearRule: { type: 'every', interval: 3, exceptions: [19, 42] },
    seasons: [
      { id: 's1', name: 'Spring', startMonth: 0, startDay: 1, endMonth: 2, endDay: 29, color: '#86EFAC' },
      { id: 's2', name: 'Summer', startMonth: 3, startDay: 1, endMonth: 5, endDay: 29, color: '#FDE047' },
      { id: 's3', name: 'Autumn', startMonth: 6, startDay: 1, endMonth: 8, endDay: 29, color: '#FDBA74' },
      { id: 's4', name: 'Winter', startMonth: 9, startDay: 1, endMonth: 11, endDay: 30, color: '#60A5FA' }
    ]
  },

  islamic: {
    id: 'islamic-' + Math.random().toString(36).substring(7),
    name: 'Islamic (Hijri) Calendar',
    type: 'standard',
    color: '#059669',
    weekDays: ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [
      { id: '1', name: 'Muharram', days: 30 },
      { id: '2', name: 'Safar', days: 29 },
      { id: '3', name: 'Rabi\' al-awwal', days: 30 },
      { id: '4', name: 'Rabi\' al-thani', days: 29 },
      { id: '5', name: 'Jumada al-awwal', days: 30 },
      { id: '6', name: 'Jumada al-thani', days: 29 },
      { id: '7', name: 'Rajab', days: 30 },
      { id: '8', name: 'Sha\'ban', days: 29 },
      { id: '9', name: 'Ramadan', days: 30 },
      { id: '10', name: 'Shawwal', days: 29 },
      { id: '11', name: 'Dhu al-Qi\'dah', days: 30 },
      { id: '12', name: 'Dhu al-Hijjah', days: 29 }
    ],
    eras: [{ id: '1', name: 'After Hijra', abbreviation: 'AH', startYear: 0 }],
    currentEpochDay: 0,
    leapYearRule: { type: 'every', interval: 30, exceptions: [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29] }
  },

  hebrew: {
    id: 'hebrew-' + Math.random().toString(36).substring(7),
    name: 'Hebrew Calendar',
    type: 'standard',
    color: '#7C3AED',
    weekDays: ['שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת', 'ראשון'],
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [
      { id: '1', name: 'Tishrei', days: 30 },
      { id: '2', name: 'Cheshvan', days: 29 },
      { id: '3', name: 'Kislev', days: 29 },
      { id: '4', name: 'Tevet', days: 29 },
      { id: '5', name: 'Shevat', days: 30 },
      { id: '6', name: 'Adar', days: 30 },
      { id: '7', name: 'Nisan', days: 30 },
      { id: '8', name: 'Iyar', days: 29 },
      { id: '9', name: 'Sivan', days: 30 },
      { id: '10', name: 'Tammuz', days: 29 },
      { id: '11', name: 'Av', days: 30 },
      { id: '12', name: 'Elul', days: 29 }
    ],
    eras: [{ id: '1', name: 'Anno Mundi', abbreviation: 'AM', startYear: 0 }],
    currentEpochDay: 0,
    leapYearRule: { type: 'every', interval: 19, exceptions: [3, 6, 8, 11, 14, 17, 19] }
  },

  buddhist: {
    id: 'buddhist-' + Math.random().toString(36).substring(7),
    name: 'Buddhist Calendar',
    type: 'standard',
    color: '#E11D48',
    weekDays: ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์'],
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [
      { id: '1', name: 'January', days: 31 },
      { id: '2', name: 'February', days: 28 },
      { id: '3', name: 'March', days: 31 },
      { id: '4', name: 'April', days: 30 },
      { id: '5', name: 'May', days: 31 },
      { id: '6', name: 'June', days: 30 },
      { id: '7', name: 'July', days: 31 },
      { id: '8', name: 'August', days: 31 },
      { id: '9', name: 'September', days: 30 },
      { id: '10', name: 'October', days: 31 },
      { id: '11', name: 'November', days: 30 },
      { id: '12', name: 'December', days: 31 }
    ],
    eras: [{ id: '1', name: 'Buddhist Era', abbreviation: 'BE', startYear: 543 }],
    currentEpochDay: 0,
    leapYearRule: { type: 'gregorian' }
  },

  internationalFixed: {
    id: 'intfix-' + Math.random().toString(36).substring(7),
    name: 'International Fixed Calendar',
    type: 'standard',
    color: '#8B5CF6',
    weekDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [
      { id: '1', name: 'January', days: 28 },
      { id: '2', name: 'February', days: 28 },
      { id: '3', name: 'March', days: 28 },
      { id: '4', name: 'April', days: 28 },
      { id: '5', name: 'May', days: 28 },
      { id: '6', name: 'June', days: 28 },
      { id: '7', name: 'Sol', days: 1 },
      { id: '8', name: 'July', days: 28 },
      { id: '9', name: 'August', days: 28 },
      { id: '10', name: 'September', days: 28 },
      { id: '11', name: 'October', days: 28 },
      { id: '12', name: 'November', days: 28 },
      { id: '13', name: 'December', days: 28 }
    ],
    eras: [{ id: '1', name: 'Common Era', abbreviation: 'CE', startYear: 0 }],
    currentEpochDay: 0,
    leapYearRule: { type: 'every', interval: 4, exceptions: [100, 400] }
  },

  custom: {
    id: 'custom-' + Math.random().toString(36).substring(7),
    name: 'Custom Calendar',
    type: 'standard',
    color: '#6B7280',
    weekDays: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [
      { id: '1', name: 'Month One', days: 30 },
      { id: '2', name: 'Month Two', days: 30 },
      { id: '3', name: 'Month Three', days: 30 },
      { id: '4', name: 'Month Four', days: 30 },
      { id: '5', name: 'Month Five', days: 30 },
      { id: '6', name: 'Month Six', days: 30 },
      { id: '7', name: 'Month Seven', days: 30 },
      { id: '8', name: 'Month Eight', days: 30 },
      { id: '9', name: 'Month Nine', days: 30 },
      { id: '10', name: 'Month Ten', days: 30 },
      { id: '11', name: 'Month Eleven', days: 30 },
      { id: '12', name: 'Month Twelve', days: 30 }
    ],
    eras: [{ id: '1', name: 'Year One', abbreviation: 'Y1', startYear: 0 }],
    currentEpochDay: 0,
    leapYearRule: { type: 'none' }
  }
};

export function getPresetCalendar(presetKey: string): CalendarSystem | null {
  const preset = CALENDAR_PRESETS[presetKey];
  if (!preset) return null;
  
  return {
    ...preset,
    id: presetKey === 'custom' ? 'custom-' + Math.random().toString(36).substring(7) : preset.id
  };
}
