// Safe localStorage wrapper with graceful failure + size guard.
const PREFIX = 'jpe.';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[storage] failed to persist ${key}`, err);
    return false;
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* noop */
  }
}

function keys(): string[] {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .map((k) => k.slice(PREFIX.length));
  } catch {
    return [];
  }
}

function clearAll(): void {
  keys().forEach(remove);
}

export const storage = {
  read,
  write,
  remove,
  keys,
  clearAll,
  get size(): number {
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) total += localStorage.getItem(k)?.length ?? 0;
      }
    } catch {
      /* noop */
    }
    return total;
  },
};
