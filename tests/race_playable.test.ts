import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstPlayable } from '../src/backend/race_playable.ts';

test('chooses the first successful source and cancels the others without aborting the winner', async () => {
  let firstSignal: AbortSignal | undefined;
  let winnerSignal: AbortSignal | undefined;
  const result = await firstPlayable([
    signal => { firstSignal = signal; return new Promise<string>((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })); },
    async signal => { winnerSignal = signal; return 'audio'; },
    async () => { throw new Error('bad response'); },
  ], 100);
  assert.equal(result, 'audio');
  assert.equal(firstSignal?.aborted, true);
  assert.equal(winnerSignal?.aborted, false);
});

test('fails promptly when all sources fail or time out', async () => {
  let signal: AbortSignal | undefined;
  await assert.rejects(firstPlayable([
    async () => { throw new Error('bad response'); },
    s => { signal = s; return new Promise<string>(() => {}); },
  ], 20), AggregateError);
  assert.equal(signal?.aborted, true);
});
