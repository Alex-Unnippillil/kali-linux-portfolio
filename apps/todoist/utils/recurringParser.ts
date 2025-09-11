import { RRule, Weekday } from 'rrule';

const DAY_MAP: Record<string, Weekday> = {
  sunday: RRule.SU,
  monday: RRule.MO,
  tuesday: RRule.TU,
  wednesday: RRule.WE,
  thursday: RRule.TH,
  friday: RRule.FR,
  saturday: RRule.SA,
};

export interface ParseResult {
  rrule: string;
  preview: Date[];
}

/**
 * Parse a natural language recurring string (e.g. "every Monday" or
 * "every 2 weeks") and return an RRULE string along with a preview of
 * upcoming occurrences. Only basic phrases are supported.
 */
export function parseRecurring(text: string, start: Date = new Date()): ParseResult | null {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();
  if (!cleaned.startsWith('every')) return null;

  const tokens = cleaned.split(/\s+/).slice(1); // remove "every"
  let interval = 1;
  let freq: number | null = null;
  let byweekday: Weekday[] | undefined;

  // handle weekday/weekend shortcuts
  if (tokens[0] === 'weekday' || tokens[0] === 'weekdays') {
    freq = RRule.WEEKLY;
    byweekday = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
  } else if (tokens[0] === 'weekend' || tokens[0] === 'weekends') {
    freq = RRule.WEEKLY;
    byweekday = [RRule.SA, RRule.SU];
  } else {
    const maybeNumber = parseInt(tokens[0] || '', 10);
    if (!isNaN(maybeNumber)) {
      interval = maybeNumber;
      tokens.shift();
    }

    const unit = tokens[0];
    switch (unit) {
      case 'day':
      case 'days':
        freq = RRule.DAILY;
        break;
      case 'week':
      case 'weeks':
        freq = RRule.WEEKLY;
        break;
      case 'month':
      case 'months':
        freq = RRule.MONTHLY;
        break;
      case 'year':
      case 'years':
        freq = RRule.YEARLY;
        break;
      default:
        // handle specific days like Monday, Tuesday etc
        const day = unit && DAY_MAP[unit];
        if (day) {
          freq = RRule.WEEKLY;
          byweekday = [day];
        }
        break;
    }
  }

  if (freq == null) return null;

  const options: any = { freq, interval };
  if (byweekday) options.byweekday = byweekday;

  const rule = new RRule(options);
  const previewRule = new RRule({ ...options, dtstart: start });
  const preview = previewRule.all().slice(0, 5);

  return { rrule: rule.toString(), preview };
}
