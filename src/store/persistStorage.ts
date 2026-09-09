import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";

type Pending = {
  timer: ReturnType<typeof setTimeout>;
  value: string;
  resolvers: Array<() => void>;
  rejecters: Array<(err: unknown) => void>;
};

const inMemory = new Map<string, string>();
const pendingWrites = new Map<string, Pending>();

const DEBOUNCE_MS = 300;

async function safeIdbSet(key: string, value: string) {
  try {
    await idbSet(key, value);
    return true;
  } catch (err) {
    console.error("idb-keyval set failed, falling back to memory store:", err);
    inMemory.set(key, value);
    return false;
  }
}

async function safeIdbGet(key: string) {
  try {
    const res = await idbGet<string>(key);
    if (res === undefined) return null;
    return res;
  } catch (err) {
    console.warn("idb-keyval get failed, using memory fallback:", err);
    return inMemory.get(key) ?? null;
  }
}

async function safeIdbDel(key: string) {
  try {
    await idbDel(key);
    return true;
  } catch (err) {
    console.warn("idb-keyval delete failed, clearing memory fallback:", err);
    inMemory.delete(key);
    return false;
  }
}

export const idbStateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // If there's a write waiting to happen, return that fresh value instantly!
    if (pendingWrites.has(name)) {
      return pendingWrites.get(name)!.value;
    }

    return safeIdbGet(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    // Debounce writes per key to avoid flood of disk operations
    if (pendingWrites.has(name)) {
      const p = pendingWrites.get(name)!;
      clearTimeout(p.timer);
      p.value = value;
      const timer = setTimeout(async () => {
        try {
          await safeIdbSet(name, p.value);
          p.resolvers.forEach((r) => r());
        } catch (err) {
          p.rejecters.forEach((r) => r(err));
        } finally {
          pendingWrites.delete(name);
        }
      }, DEBOUNCE_MS);
      p.timer = timer;
      return new Promise<void>((resolve, reject) => {
        p.resolvers.push(resolve);
        p.rejecters.push(reject);
      });
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(async () => {
        try {
          await safeIdbSet(name, value);
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          pendingWrites.delete(name);
        }
      }, DEBOUNCE_MS);

      pendingWrites.set(name, {
        timer,
        value,
        resolvers: [resolve],
        rejecters: [reject],
      });
    });
  },
  removeItem: async (name: string): Promise<void> => {
    // cancel pending writes
    const pending = pendingWrites.get(name);
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolvers.forEach((r) => r());
      pendingWrites.delete(name);
    }
    await safeIdbDel(name);
  },
};

export default idbStateStorage;
