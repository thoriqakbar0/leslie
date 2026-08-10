interface LeslieStorageBridge {
  /** Load the local state through Electron's main-process database boundary. */
  load(): Promise<unknown>;
  /** Save unknown input through Electron's validated main-process database boundary. */
  save(state: unknown): Promise<unknown>;
}

interface Window {
  readonly leslieStorage: LeslieStorageBridge;
}
