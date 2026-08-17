const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateParts(dateStr: string) {
  const match = DATE_PATTERN.exec(dateStr);

  if (!match) {
    throw new Error(`Invalid date "${dateStr}". Expected YYYY-MM-DD.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate()
  ) {
    throw new Error(`Invalid date "${dateStr}".`);
  }

  return { year, month, day };
}

export function getCycleDay(dateStr: string): number {
  return parseDateParts(dateStr).day;
}

export function getSafeDueDate(
  year: number,
  zeroBasedMonth: number,
  cycleDay: number
): string {
  const normalized = new Date(Date.UTC(year, zeroBasedMonth, 1));
  const normalizedYear = normalized.getUTCFullYear();
  const normalizedMonth = normalized.getUTCMonth();

  const lastDay = new Date(
    Date.UTC(normalizedYear, normalizedMonth + 1, 0)
  ).getUTCDate();

  const safeDay = Math.min(Math.max(cycleDay, 1), lastDay);

  return [
    normalizedYear,
    String(normalizedMonth + 1).padStart(2, "0"),
    String(safeDay).padStart(2, "0"),
  ].join("-");
}

export function generateDueDates(
  admissionDate: string,
  months: number
): string[] {
  const { year, month, day } = parseDateParts(admissionDate);

  if (!Number.isInteger(months) || months < 1 || months > 120) {
    throw new Error("Months must be between 1 and 120.");
  }

  const dueDates: string[] = [];

  for (let offset = 1; offset <= months; offset++) {
    const normalized = new Date(
      Date.UTC(year, month - 1 + offset, 1)
    );

    dueDates.push(
      getSafeDueDate(
        normalized.getUTCFullYear(),
        normalized.getUTCMonth(),
        day
      )
    );
  }

  return dueDates;
}

export function getMonthInfo(
  dateStr: string
): { month: string; label: string } {
  const { year, month } = parseDateParts(dateStr);

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return {
    month: `${year}-${String(month).padStart(2, "0")}`,
    label: `${monthNames[month - 1]} ${year}`,
  };
}

function todayAsDateString(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

export function calculateLateFee(
  dueDate: string,
  lateFeePerDay: number
): number {
  if (lateFeePerDay <= 0) return 0;

  const due = parseDateParts(dueDate);
  const today = parseDateParts(todayAsDateString());

  const dueTime = Date.UTC(due.year, due.month - 1, due.day);
  const todayTime = Date.UTC(today.year, today.month - 1, today.day);

  const lateDays = Math.max(
    0,
    Math.floor((todayTime - dueTime) / 86_400_000)
  );

  return lateDays * lateFeePerDay;
}

export function isOverdue(dueDate: string): boolean {
  return dueDate < todayAsDateString();
}