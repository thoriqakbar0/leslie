import * as chrono from "chrono-node";
import { parsePlannedDuration } from "./model";
import type { EstimateMinutes } from "./model";

const PLANNING_LOCALE_CATALOG = [
  "af",
  "am",
  "ar",
  "as",
  "az",
  "be",
  "bg",
  "bn",
  "bo",
  "bs",
  "ca",
  "cs",
  "cy",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "eu",
  "fa",
  "fi",
  "fil",
  "fo",
  "fr",
  "ga",
  "gd",
  "gl",
  "gu",
  "he",
  "hi",
  "hr",
  "hu",
  "hy",
  "id",
  "is",
  "it",
  "ja",
  "ka",
  "kk",
  "km",
  "kn",
  "ko",
  "ky",
  "lo",
  "lt",
  "lv",
  "mk",
  "ml",
  "mn",
  "mr",
  "ms",
  "mt",
  "my",
  "nb",
  "ne",
  "nl",
  "nn",
  "or",
  "pa",
  "pl",
  "ps",
  "pt",
  "ro",
  "ru",
  "si",
  "sk",
  "sl",
  "sq",
  "sr",
  "sv",
  "sw",
  "ta",
  "te",
  "th",
  "tr",
  "uk",
  "ur",
  "uz",
  "vi",
  "zh-Hans",
  "zh-Hant",
  "zu",
] as const;

/** Locales whose long weekday names this JavaScript runtime can format and Leslie can parse. */
export const PLANNING_LOCALES: readonly string[] =
  Intl.DateTimeFormat.supportedLocalesOf(PLANNING_LOCALE_CATALOG);

export interface ParsedPlannedInput {
  readonly title: string;
  readonly estimatedMinutes: EstimateMinutes;
  readonly scheduledAt: number;
}

interface TextSpan {
  readonly start: number;
  readonly end: number;
}

interface ClockMatch extends TextSpan {
  readonly hours: number;
  readonly minutes: number;
}

interface WeekdayMatch extends TextSpan {
  readonly weekday: number;
}

interface WeekdayName {
  readonly name: string;
  readonly weekday: number;
}

const weekdayNamesByLocale = new Map<string, readonly WeekdayName[]>();
const localeSet = new Set(PLANNING_LOCALES.map((locale) => locale.toLowerCase()));
const decimalZeroCodePoints = [
  0x0030, 0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6,
  0x0d66, 0x0de6, 0x0e50, 0x0ed0, 0x0f20, 0x1040, 0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80,
  0x1a90, 0x1b50, 0x1bb0, 0x1c40, 0x1c50, 0xa620, 0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0,
  0xff10,
] as const;
const wordCharacter = /[\p{L}\p{N}\p{M}]/u;
const clockPattern =
  /(?<![\p{L}\p{N}])(?<hour>[0-2]?\d)(?:(?<colon>[:.])(?<minute>[0-5]\d)|h(?<hMinute>[0-5]\d)|(?<marker>時|时|點|点|시)\s*(?<markerMinute>[0-5]?\d)?\s*(?:分|분)?)(?:\s*(?<meridiem>am|pm))?(?![\p{L}\p{N}])/giu;
const rangeSeparator = /^\s*(?:-|–|—|to\b|until\b|till\b|à\b|a\b|bis\b|至|到|〜|～)\s*/iu;
const edgeConnector =
  /^(?:(?:at|on|for|in|by|around|about|pukul|jam|um|am|à|às|a las|de|em|kl\.?|klockan|om|в|во|о|об|на|u|v|ve|w|we|o|en|el|la|las|los|في|عند|الساعة|ساعت|بجے|को|पर|বেলা|সময়|ਸਮੇਂ|એ|மணிக்கு|గంటలకు|ಕ್ಕೆ|ന്|เวลา|ตอน|ເວລາ|ម៉ោង|အချိန်|에|시|に|于|於)\s+)+/iu;
const trailingConnector =
  /\s+(?:(?:at|on|for|in|by|around|about|pukul|jam|um|am|à|às|a las|de|em|kl\.?|klockan|om|в|во|о|об|на|u|v|ve|w|we|o|en|el|la|las|los|في|عند|الساعة|ساعت|بجے|को|पर|বেলা|সময়|ਸਮੇਂ|એ|மணிக்கு|గంటలకు|ಕ್ಕೆ|ന്|เวลา|ตอน|ເວລາ|ម៉ោង|အချိန်|에|시|に|于|於))+$/iu;

const chronoByLanguage: Readonly<Record<string, chrono.Chrono>> = {
  de: chrono.de.casual,
  en: chrono.en.casual,
  es: chrono.es.casual,
  fi: chrono.fi.casual,
  fr: chrono.fr.casual,
  it: chrono.it.casual,
  ja: chrono.ja.casual,
  nl: chrono.nl.casual,
  pt: chrono.pt.casual,
  ru: chrono.ru.casual,
  sv: chrono.sv.casual,
  uk: chrono.uk.casual,
  vi: chrono.vi.casual,
  "zh-hans": chrono.zh.hans.casual,
  "zh-hant": chrono.zh.hant.casual,
};

const chronoParsers = [...new Set(Object.values(chronoByLanguage))];

function normalizeDigits(value: string): string {
  return value.normalize("NFKC").replace(/\p{Nd}/gu, (digit) => {
    const codePoint = digit.codePointAt(0);
    if (codePoint === undefined) return digit;
    const zero = decimalZeroCodePoints.find(
      (candidate) => codePoint >= candidate && codePoint <= candidate + 9,
    );
    return zero === undefined ? digit : String(codePoint - zero);
  });
}

function localeLanguage(locale: string): string {
  const canonical = Intl.getCanonicalLocales(locale)[0]?.toLowerCase() ?? "";
  if (canonical.startsWith("zh-hant")) return "zh-hant";
  if (canonical.startsWith("zh")) return "zh-hans";
  return canonical.split("-")[0] ?? "";
}

function supportedLocale(locale: string): string | null {
  const canonical = Intl.DateTimeFormat.supportedLocalesOf([locale])[0];
  if (canonical === undefined) return null;
  const lower = canonical.toLowerCase();
  if (localeSet.has(lower)) return canonical;
  const language = localeLanguage(canonical);
  return PLANNING_LOCALES.find((candidate) => localeLanguage(candidate) === language) ?? null;
}

function localesForInput(value: string, localeHints: readonly string[]): readonly string[] {
  const hinted = localeHints.flatMap((locale) => {
    try {
      const supported = supportedLocale(locale);
      return supported === null ? [] : [supported];
    } catch {
      return [];
    }
  });
  const scriptLocales = PLANNING_LOCALES.filter((locale) => {
    if (/\p{Script=Arabic}/u.test(value)) return ["ar", "fa", "ps", "ur"].includes(locale);
    if (/\p{Script=Cyrillic}/u.test(value)) {
      return ["be", "bg", "kk", "ky", "mk", "mn", "ru", "sr", "uk", "uz"].includes(locale);
    }
    if (/\p{Script=Devanagari}/u.test(value)) return ["hi", "mr", "ne"].includes(locale);
    if (/\p{Script=Bengali}/u.test(value)) return ["as", "bn"].includes(locale);
    if (/\p{Script=Gurmukhi}/u.test(value)) return locale === "pa";
    if (/\p{Script=Gujarati}/u.test(value)) return locale === "gu";
    if (/\p{Script=Oriya}/u.test(value)) return locale === "or";
    if (/\p{Script=Tamil}/u.test(value)) return locale === "ta";
    if (/\p{Script=Telugu}/u.test(value)) return locale === "te";
    if (/\p{Script=Kannada}/u.test(value)) return locale === "kn";
    if (/\p{Script=Malayalam}/u.test(value)) return locale === "ml";
    if (/\p{Script=Sinhala}/u.test(value)) return locale === "si";
    if (/\p{Script=Thai}/u.test(value)) return locale === "th";
    if (/\p{Script=Lao}/u.test(value)) return locale === "lo";
    if (/\p{Script=Khmer}/u.test(value)) return locale === "km";
    if (/\p{Script=Myanmar}/u.test(value)) return locale === "my";
    if (/\p{Script=Hebrew}/u.test(value)) return locale === "he";
    if (/\p{Script=Georgian}/u.test(value)) return locale === "ka";
    if (/\p{Script=Armenian}/u.test(value)) return locale === "hy";
    if (/\p{Script=Ethiopic}/u.test(value)) return locale === "am";
    if (/\p{Script=Tibetan}/u.test(value)) return locale === "bo";
    if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(value)) return locale === "ja";
    if (/\p{Script=Hangul}/u.test(value)) return locale === "ko";
    if (/\p{Script=Han}/u.test(value)) return ["ja", "zh-Hans", "zh-Hant"].includes(locale);
    return /\p{Script=Latin}/u.test(value);
  });
  return [...new Set([...hinted, ...scriptLocales])];
}

function weekdayNames(locale: string): readonly WeekdayName[] {
  const cached = weekdayNamesByLocale.get(locale);
  if (cached !== undefined) return cached;
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  const names = Array.from({ length: 7 }, (_, weekday) => ({
    name: formatter.format(new Date(Date.UTC(2024, 0, 7 + weekday))).normalize("NFKC"),
    weekday,
  })).sort((left, right) => right.name.length - left.name.length);
  weekdayNamesByLocale.set(locale, names);
  return names;
}

function hasWordBoundary(value: string, start: number, end: number): boolean {
  const first = value[start] ?? "";
  const last = value[end - 1] ?? "";
  const before = value[start - 1] ?? "";
  const after = value[end] ?? "";
  if (!wordCharacter.test(first) || !wordCharacter.test(last)) return true;
  return !wordCharacter.test(before) && !wordCharacter.test(after);
}

function findWeekday(value: string, locales: readonly string[]): WeekdayMatch | null {
  const lowerValue = value.toLocaleLowerCase();
  for (const locale of locales) {
    for (const weekday of weekdayNames(locale)) {
      const name = weekday.name.toLocaleLowerCase();
      let start = lowerValue.indexOf(name);
      while (start >= 0) {
        const end = start + name.length;
        const hasJoinedScript =
          /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u.test(
            name,
          );
        if (hasJoinedScript || hasWordBoundary(lowerValue, start, end)) {
          return { start, end, weekday: weekday.weekday };
        }
        start = lowerValue.indexOf(name, start + 1);
      }
    }
  }
  return null;
}

function findClocks(value: string): readonly ClockMatch[] {
  const clocks: ClockMatch[] = [];
  for (const match of value.matchAll(clockPattern)) {
    const groups = match.groups;
    const rawHour = Number(groups?.hour);
    const minute = Number(groups?.minute ?? groups?.hMinute ?? groups?.markerMinute ?? 0);
    const meridiem = groups?.meridiem?.toLowerCase();
    if (!Number.isInteger(rawHour) || !Number.isInteger(minute)) continue;
    if (meridiem !== undefined && (rawHour < 1 || rawHour > 12)) continue;
    if (meridiem === undefined && rawHour > 23) continue;
    const hours =
      meridiem === "pm" ? (rawHour % 12) + 12 : meridiem === "am" ? rawHour % 12 : rawHour;
    const start = match.index;
    clocks.push({ start, end: start + match[0].length, hours, minutes: minute });
  }
  return clocks;
}

function clockRangeSpan(value: string, clocks: readonly ClockMatch[]): TextSpan | null {
  const first = clocks[0];
  const second = clocks[1];
  if (first === undefined || second === undefined) return first ?? null;
  const between = value.slice(first.end, second.start);
  return rangeSeparator.test(between) ? { start: first.start, end: second.end } : first;
}

function dateForWeekday(reference: Date, match: WeekdayMatch, clock: ClockMatch | undefined): Date {
  const scheduled = new Date(reference);
  if (clock !== undefined) scheduled.setHours(clock.hours, clock.minutes, 0, 0);
  const daysAhead = (match.weekday - reference.getDay() + 7) % 7;
  scheduled.setDate(scheduled.getDate() + daysAhead);
  if (daysAhead === 0 && (clock === undefined || scheduled.getTime() <= reference.getTime())) {
    scheduled.setDate(scheduled.getDate() + 7);
  }
  return scheduled;
}

function cleanTitle(value: string, spans: readonly TextSpan[]): string {
  let title = value;
  for (const span of [...spans].sort((left, right) => right.start - left.start)) {
    title = `${title.slice(0, span.start)} ${title.slice(span.end)}`;
  }
  title = title.replace(/[\s,;:()[\]{}\-–—]+/gu, " ").trim();
  let previous = "";
  while (previous !== title) {
    previous = title;
    title = title.replace(edgeConnector, "").replace(trailingConnector, "").trim();
  }
  return title;
}

function chronoParsersFor(localeHints: readonly string[]): readonly chrono.Chrono[] {
  const preferred = localeHints.flatMap((locale) => {
    try {
      const language = localeLanguage(locale);
      const parser = chronoByLanguage[language];
      return parser === undefined ? [] : [parser];
    } catch {
      return [];
    }
  });
  return [...new Set([...preferred, ...chronoParsers])];
}

function parseChronoDate(
  value: string,
  reference: Date,
  localeHints: readonly string[],
): { readonly scheduledAt: number; readonly span: TextSpan } | null {
  for (const parser of chronoParsersFor(localeHints)) {
    const results = parser.parse(value, reference, { forwardDate: true });
    const result = results.find((candidate) =>
      ["year", "month", "day", "weekday"].some((component) =>
        candidate.start.isCertain(component as "year" | "month" | "day" | "weekday"),
      ),
    );
    if (result === undefined) continue;
    const scheduled = result.start.date();
    if (!result.start.isCertain("hour")) {
      scheduled.setHours(
        reference.getHours(),
        reference.getMinutes(),
        reference.getSeconds(),
        reference.getMilliseconds(),
      );
    }
    return {
      scheduledAt: scheduled.getTime(),
      span: { start: result.index, end: result.index + result.text.length },
    };
  }
  return null;
}

/** Parse a planned title, expected duration, and multilingual calendar expression. */
export function parsePlannedInput(
  value: string,
  fallbackMinutes: EstimateMinutes,
  reference = new Date(),
  localeHints: readonly string[] = [],
): ParsedPlannedInput {
  const duration = parsePlannedDuration(normalizeDigits(value), fallbackMinutes);
  const text = duration.title;
  const locales = localesForInput(text, localeHints);
  const weekday = findWeekday(text, locales);
  const clocks = findClocks(text);
  const firstClock = clocks[0];

  if (weekday !== null) {
    const clockSpan = clockRangeSpan(text, clocks);
    const title = cleanTitle(text, clockSpan === null ? [weekday] : [weekday, clockSpan]);
    return {
      title: title || text,
      estimatedMinutes: duration.estimatedMinutes,
      scheduledAt: dateForWeekday(reference, weekday, firstClock).getTime(),
    };
  }

  const naturalDate = parseChronoDate(text, reference, localeHints);
  if (naturalDate !== null) {
    const title = cleanTitle(text, [naturalDate.span]);
    return {
      title: title || text,
      estimatedMinutes: duration.estimatedMinutes,
      scheduledAt: naturalDate.scheduledAt,
    };
  }

  if (firstClock !== undefined) {
    const scheduled = new Date(reference);
    scheduled.setHours(firstClock.hours, firstClock.minutes, 0, 0);
    if (scheduled.getTime() <= reference.getTime()) scheduled.setDate(scheduled.getDate() + 1);
    const clockSpan = clockRangeSpan(text, clocks);
    const title = cleanTitle(text, clockSpan === null ? [] : [clockSpan]);
    return {
      title: title || text,
      estimatedMinutes: duration.estimatedMinutes,
      scheduledAt: scheduled.getTime(),
    };
  }

  return {
    title: text,
    estimatedMinutes: duration.estimatedMinutes,
    scheduledAt: reference.getTime(),
  };
}
