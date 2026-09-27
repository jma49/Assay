/**
 * Limits how many tasks run at once in this process. Queued tasks start in
 * arrival order as running ones finish, whether they resolve or throw.
 */
export function createSemaphore(limit: number) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("limit must be a positive integer");
  let active = 0;
  const waiting: (() => void)[] = [];

  const acquire = () =>
    new Promise<void>((resolve) => {
      if (active < limit) {
        active++;
        resolve();
      } else {
        waiting.push(() => {
          active++;
          resolve();
        });
      }
    });

  const release = () => {
    active--;
    waiting.shift()?.();
  };

  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      await acquire();
      try {
        return await task();
      } finally {
        release();
      }
    },
    get active() {
      return active;
    },
    get queued() {
      return waiting.length;
    },
  };
}

export type Semaphore = ReturnType<typeof createSemaphore>;
