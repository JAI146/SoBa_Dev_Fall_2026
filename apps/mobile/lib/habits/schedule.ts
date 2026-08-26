import { type Habit } from '@/lib/fixtures/habits';

const weekdayNames = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
];

export function formatHabitSchedule(habit: Habit) {
  if (habit.cadence === 'daily') {
    return habit.preferredTime ? `Every day at ${formatTime(habit.preferredTime)}` : 'Every day';
  }

  const weekday = habit.scheduledWeekdays[0];
  return weekday === undefined ? 'Once a week' : weekdayNames[weekday] ?? 'Once a week';
}

function formatTime(time: string) {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return time;
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${String(minute).padStart(2, '0')} ${period}`;
}
