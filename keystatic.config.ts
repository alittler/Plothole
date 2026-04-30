import { collection, config, fields } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },
  collections: {
    calendars: collection({
      label: 'Calendars',
      slugField: 'name',
      path: '.keystatic/calendars/*',
      format: { contentField: 'content' },
      schema: {
        id: fields.slug({ name: { label: 'Calendar ID' } }),
        name: fields.text({
          label: 'Calendar Name',
          description: 'Name of the calendar system',
        }),
        type: fields.select({
          label: 'Calendar Type',
          description: 'Type of calendar',
          options: [
            { label: 'Standard', value: 'standard' },
            { label: 'Fantasy', value: 'fantasy-calendar' },
          ],
          defaultValue: 'standard',
        }),
        color: fields.text({
          label: 'Color',
          description: 'Hex color code (e.g., #3B82F6)',
          defaultValue: '#3B82F6',
        }),
        daysPerWeek: fields.number({
          label: 'Days Per Week',
          description: 'Number of days in a week',
          defaultValue: 7,
          validation: { min: 5, max: 10 },
        }),
        hoursPerDay: fields.number({
          label: 'Hours Per Day',
          description: 'Number of hours in a day',
          defaultValue: 24,
        }),
        weekDays: fields.array(
          fields.text({
            label: 'Day Name',
            placeholder: 'e.g., Monday',
          }),
          {
            label: 'Week Days',
            description: 'Names of the days of the week',
            itemLabel: (props) => props.value || 'Day',
          }
        ),
        months: fields.array(
          fields.object({
            id: fields.text({ label: 'Month ID' }),
            name: fields.text({ label: 'Month Name' }),
            days: fields.number({
              label: 'Days in Month',
              validation: { min: 28, max: 31 },
            }),
          }),
          {
            label: 'Months',
            description: 'Months in the calendar',
            itemLabel: (props) => props.fields.name.value || 'Month',
          }
        ),
        eras: fields.array(
          fields.object({
            id: fields.text({ label: 'Era ID' }),
            name: fields.text({ label: 'Era Name' }),
            abbreviation: fields.text({
              label: 'Abbreviation',
              description: 'Short form of era name (max 3 chars)',
            }),
            startYear: fields.number({
              label: 'Start Year',
              defaultValue: 0,
            }),
          }),
          {
            label: 'Eras',
            description: 'Historical eras in the calendar',
            itemLabel: (props) => props.fields.name.value || 'Era',
          }
        ),
        moons: fields.array(
          fields.object({
            id: fields.text({ label: 'Moon ID' }),
            name: fields.text({ label: 'Moon Name' }),
            cycleLength: fields.number({
              label: 'Cycle Length (days)',
              validation: { min: 1 },
            }),
            offset: fields.number({
              label: 'Offset',
              defaultValue: 0,
            }),
            color: fields.text({
              label: 'Color',
              defaultValue: '#E0E7FF',
            }),
          }),
          {
            label: 'Moons',
            description: 'Fantasy calendar moons',
            itemLabel: (props) => props.fields.name.value || 'Moon',
          }
        ),
        seasons: fields.array(
          fields.object({
            id: fields.text({ label: 'Season ID' }),
            name: fields.text({ label: 'Season Name' }),
            startMonth: fields.number({ label: 'Start Month' }),
            startDay: fields.number({ label: 'Start Day' }),
            endMonth: fields.number({ label: 'End Month' }),
            endDay: fields.number({ label: 'End Day' }),
            color: fields.text({ label: 'Color' }),
          }),
          {
            label: 'Seasons',
            description: 'Seasonal divisions',
            itemLabel: (props) => props.fields.name.value || 'Season',
          }
        ),
        intercalaries: fields.array(
          fields.object({
            id: fields.text({ label: 'Intercalary ID' }),
            name: fields.text({ label: 'Name' }),
            month: fields.number({ label: 'Month' }),
            day: fields.number({ label: 'Day' }),
            length: fields.number({ label: 'Length', defaultValue: 1 }),
          }),
          {
            label: 'Intercalary Days',
            description: 'Special intercalary days outside normal month structure',
            itemLabel: (props) => props.fields.name.value || 'Intercalary',
          }
        ),
        leapYearRule: fields.object(
          {
            type: fields.select({
              label: 'Leap Year Type',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Gregorian', value: 'gregorian' },
                { label: 'Every N years', value: 'every' },
                { label: 'Custom', value: 'custom' },
              ],
              defaultValue: 'none',
            }),
            interval: fields.number({
              label: 'Interval (years)',
              defaultValue: 4,
            }),
            exceptions: fields.array(fields.number({ label: 'Year' }), {
              label: 'Exception Years',
              itemLabel: (props) => `Year ${props.value}`,
            }),
          },
          {
            label: 'Leap Year Rule',
            description: 'How leap years are calculated',
          }
        ),
        currentEpochDay: fields.number({
          label: 'Current Epoch Day',
          description: 'Current day in the epoch',
          defaultValue: 0,
        }),
        content: fields.text({
          label: 'Notes',
          description: 'Additional notes about this calendar',
          ui: { displayMode: 'textarea' },
        }),
      },
    }),
  },
});
