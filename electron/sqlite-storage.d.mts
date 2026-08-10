import type { LeslieState } from "../src/model";

/** An owned connection to Leslie's relational SQLite database. */
export interface LeslieDatabase {
  /** Return the stored state, or null before the first save. */
  loadState(): LeslieState | null;
  /** Replace the stored state transactionally after parsing unknown input. */
  saveState(value: unknown): void;
  /** Close the database connection. */
  close(): void;
}

/** Open Leslie's relational SQLite store and own its connection until close. */
export function createLeslieDatabase(databasePath: string): LeslieDatabase;
