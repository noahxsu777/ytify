/** Return the first successful probe, stopping the other probes after a winner. */
export async function firstPlayable<T>(
  probes: Array<(signal: AbortSignal) => Promise<T>>,
  timeoutMs: number,
): Promise<T> {
  const controllers = probes.map(() => new AbortController());
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  let winner = -1;
  try {
    const jobs = probes.map((probe, index) => new Promise<{ value: T; index: number }>((resolve, reject) => {
      const controller = controllers[index];
      timers[index] = setTimeout(() => {
        controller.abort();
        reject(new Error('Audio source timed out'));
      }, timeoutMs);
      Promise.resolve().then(() => probe(controller.signal)).then(value => resolve({ value, index }), reject);
    }).finally(() => clearTimeout(timers[index])));
    const result = await Promise.any(jobs);
    winner = result.index;
    return result.value;
  } finally {
    controllers.forEach((controller, index) => { if (index !== winner) controller.abort(); });
    timers.forEach(clearTimeout);
  }
}
