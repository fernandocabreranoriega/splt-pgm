// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveSession} from '../extension/live.js';

test('queues input that arrives during delivery without duplicate sends', async () => {
    const chunks = [];
    let release;
    const sender = {
        cancel() {},
        async send(chunk, targets) {
            assert.deepEqual(targets, ['a', 'b']);
            chunks.push(chunk);
            if (chunks.length === 1)
                await new Promise(resolve => { release = resolve; });
        },
    };
    const session = new LiveSession(sender, ['a', 'b']);
    session.append('a');
    const sending = session.flush();
    session.append('b');
    session.append('c');
    await session.flush();
    release();
    await sending;
    assert.deepEqual(chunks, ['a', 'bc']);
    assert.equal(session.text, 'abc');
    assert.equal(session.pending, '');
});

test('a partially delivered chunk is never retried', async () => {
    let attempts = 0;
    const session = new LiveSession({
        cancel() {},
        async send() { attempts++; throw new Error('focus lost'); },
    }, ['a', 'b']);
    session.append('a');
    await session.flush();
    await session.flush();
    assert.equal(attempts, 1);
    assert.equal(session.active, false);
    assert.match(session.error.message, /focus lost/);
});

test('stop drops pending input and cancels an in-flight delivery', async () => {
    let cancelled = 0;
    const session = new LiveSession({cancel() { cancelled++; }}, ['a', 'b']);
    session.append('a');
    session.stop();
    session.append('b');
    await session.flush();
    assert.equal(cancelled, 1);
    assert.equal(session.text, 'a');
    assert.equal(session.pending, '');
});

test('rejects unsupported input and bounds the in-memory transcript', () => {
    const session = new LiveSession({cancel() {}}, ['a', 'b']);
    for (const value of ['', 'ab', '\n', '\b', 'ñ', '😀'])
        assert.throws(() => session.append(value), /ASCII/);
    for (let i = 0; i < 256; i++) session.append('a');
    assert.throws(() => session.append('b'), /256/);
    assert.equal(session.text.length, 256);
});
