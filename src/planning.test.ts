import { describe, expect, it } from "vite-plus/test";
import { parsePlannedInput, PLANNING_LOCALES } from "./planning";

const reference = new Date(2026, 7, 10, 14, 0, 0, 0);

function localDate(day: number, hours: number, minutes: number): number {
  return new Date(2026, 7, day, hours, minutes, 0, 0).getTime();
}

describe("multilingual planned input", () => {
  it.each([
    ["Rapat Kamis pukul ٨:٣٠", "id", "Rapat", localDate(13, 8, 30)],
    ["Встреча в пятница 18:30", "ru", "Встреча", localDate(14, 18, 30)],
    ["اجتماع الاثنين الساعة ٠٨:٣٠", "ar", "اجتماع", localDate(17, 8, 30)],
    ["बैठक सोमवार को ०८:३०", "hi", "बैठक", localDate(17, 8, 30)],
    ["会議 月曜日 8時30分", "ja", "会議", localDate(17, 8, 30)],
    ["ประชุม วันพฤหัสบดี เวลา ๘:๓๐", "th", "ประชุม", localDate(13, 8, 30)],
  ])("parses %s", (input, locale, title, scheduledAt) => {
    expect(parsePlannedInput(input, 30, reference, [locale])).toEqual({
      title,
      estimatedMinutes: 30,
      scheduledAt,
    });
  });

  it("parses every long weekday name in the exported runtime locale catalog", () => {
    for (const locale of PLANNING_LOCALES) {
      const formatter = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
      for (let weekday = 0; weekday < 7; weekday += 1) {
        const weekdayName = formatter.format(new Date(Date.UTC(2024, 0, 7 + weekday)));
        const result = parsePlannedInput(`Task ${weekdayName}`, 30, reference, [locale]);
        const scheduled = new Date(result.scheduledAt);

        expect(result.title, `${locale}: ${weekdayName}`).toBe("Task");
        expect(scheduled.getDay(), `${locale}: ${weekdayName}`).toBe(weekday);
        expect(result.scheduledAt, `${locale}: ${weekdayName}`).toBeGreaterThan(
          reference.getTime(),
        );
      }
    }
  });
});

describe("natural date phrases", () => {
  it.each([
    ["Task tomorrow", "en"],
    ["Task morgen", "de"],
    ["Task mañana", "es"],
    ["Task huomenna", "fi"],
    ["Task demain", "fr"],
    ["Task domani", "it"],
    ["Task 明日", "ja"],
    ["Task morgen", "nl"],
    ["Task amanhã", "pt"],
    ["Task завтра", "ru"],
    ["Task imorgon", "sv"],
    ["Task завтра", "uk"],
    ["Task ngày mai", "vi"],
    ["Task 明天", "zh-Hans"],
    ["Task 明天", "zh-Hant"],
  ])("parses tomorrow in %s with %s", (input, locale) => {
    const result = parsePlannedInput(input, 30, reference, [locale]);

    expect(result.title).toBe("Task");
    expect(result.scheduledAt).toBe(localDate(11, 14, 0));
  });
});

describe("clock scheduling", () => {
  it("keeps a future clock on the selected weekday", () => {
    expect(parsePlannedInput("Call Monday at 18:30", 30, reference, ["en"])).toEqual({
      title: "Call",
      estimatedMinutes: 30,
      scheduledAt: localDate(10, 18, 30),
    });
  });

  it("moves a past clock on the selected weekday to the next week", () => {
    expect(parsePlannedInput("Call Monday at 08:30", 30, reference, ["en"]).scheduledAt).toBe(
      localDate(17, 8, 30),
    );
  });

  it("moves a past time-only expression to the next day", () => {
    expect(parsePlannedInput("Call at 8.30", 30, reference, ["en"])).toEqual({
      title: "Call",
      estimatedMinutes: 30,
      scheduledAt: localDate(11, 8, 30),
    });
  });

  it("uses the first clock in a range and removes the complete range", () => {
    expect(parsePlannedInput("Focus 18:30–20:00", 30, reference, ["en"])).toEqual({
      title: "Focus",
      estimatedMinutes: 30,
      scheduledAt: localDate(10, 18, 30),
    });
  });

  it("keeps invalid clock text unscheduled", () => {
    expect(parsePlannedInput("Call at 24:30", 30, reference, ["en"])).toEqual({
      title: "Call at 24:30",
      estimatedMinutes: 30,
      scheduledAt: reference.getTime(),
    });
  });

  it("does not treat expected duration as a scheduled date", () => {
    expect(parsePlannedInput("Deep work for two hours", 30, reference, ["en"])).toEqual({
      title: "Deep work",
      estimatedMinutes: 120,
      scheduledAt: reference.getTime(),
    });
  });
});
