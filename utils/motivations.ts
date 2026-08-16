const START_MESSAGES = [
  "Just start. Five minutes is enough.",
  "Don't think. Begin.",
  "Open it. Do one minute.",
  "Start before you're ready.",
  "Action comes before motivation.",
  "The hardest part is starting.",
  "One small step is enough.",
  "Begin now. Decide later.",
  "Five minutes can change your day.",
  "Start ugly. Improve tomorrow.",
];

const CONTINUE_MESSAGES = [
  "You've started. Keep going.",
  "One more task.",
  "Momentum is on your side.",
  "Don't stop halfway.",
  "Keep moving.",
  "Finish another one.",
  "You're doing better than zero.",
  "Stay in motion.",
];

const FINISH_MESSAGES = [
  "You're close. Finish strong.",
  "One last push.",
  "Finish what you started.",
  "Complete today's mission.",
  "Leave nothing unfinished.",
];

const RECOVERY_MESSAGES = [
  "Missing one day isn't failure.",
  "Yesterday is over. Start today.",
  "You didn't fail. You paused.",
  "Restarting is part of discipline.",
  "Don't miss twice.",
  "Tomorrow begins with today.",
];

function pick(list: string[], seed: number) {
  return list[seed % list.length];
}

export function getDailyNudge(
  completed: number,
  total: number,
  yesterdayMissed: boolean
): string {
  const now = new Date();
  const seed = now.getDate() + now.getMonth() * 31;

  if (yesterdayMissed)
    return pick(RECOVERY_MESSAGES, seed);

  if (total === 0)
    return pick(START_MESSAGES, seed);

  if (completed === 0)
    return pick(START_MESSAGES, seed);

  if (completed < total)
    return pick(CONTINUE_MESSAGES, seed);

  return pick(FINISH_MESSAGES, seed);
}
