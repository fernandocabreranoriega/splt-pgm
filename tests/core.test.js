// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {Broadcaster, validateText, toKeyval} from '../extension/core.js';

function fixture() {
    const output = new Map([['editor', []], ['writer', []]]);
    let focused = null;
    const backend = {
        validateTarget(target) {
            if (!output.has(target)) throw new Error('closed');
        },
        async focus(target) { focused = target; },
        assertReady(target) {
            if (focused !== target) throw new Error('focus changed');
            this.validateTarget(target);
        },
        tap(keyval) { output.get(focused).push(keyval); },
        async delay() {},
    };
    return {engine: new Broadcaster(backend), backend, output, stealFocus() { focused = 'other'; }};
}

test('delivers the same Unicode sequence to both targets', async () => {
    const {engine, output} = fixture();
    assert.deepEqual(await engine.send('Hello ñ 😀', ['editor', 'writer']), {completed: 2});
    assert.deepEqual(output.get('editor'), output.get('writer'));
    assert.equal(toKeyval('ñ'), 0xf1);
    assert.equal(toKeyval('😀'), 0x0101f600);
});

test('rejects terminal control characters and excessive input', () => {
    for (const text of ['', 'a\nb', '\t', '\x1b', '\x7f', 'a'.repeat(257)])
        assert.throws(() => validateText(text));
    assert.equal(validateText('😀'.repeat(256)).length, 256);
});

test('validates all targets before any typing', async () => {
    const {engine, output} = fixture();
    await assert.rejects(engine.send('hello', ['editor', 'closed']), /closed/);
    assert.equal(output.get('editor').length, 0);
    for (const targets of [[], ['editor'], ['editor', 'editor']])
        await assert.rejects(engine.send('hello', targets), /Select/);
});

test('stops when focus is stolen without typing the remaining characters', async () => {
    const {engine, backend, output, stealFocus} = fixture();
    backend.delay = async () => stealFocus();
    await assert.rejects(engine.send('abc', ['editor', 'writer']), /focus changed/);
    assert.equal(output.get('editor').length, 1);
    assert.equal(output.get('writer').length, 0);
    assert.equal(engine.running, false);
});

test('cancellation preserves partial delivery and does not retry', async () => {
    const {engine, backend, output} = fixture();
    backend.delay = async () => engine.cancel();
    await assert.rejects(engine.send('abc', ['editor', 'writer']), /Sending stopped/);
    assert.equal(output.get('editor').length, 1);
    assert.equal(output.get('writer').length, 0);
});

test('concurrent send cannot reset the active cancellation state', async () => {
    const {engine, backend} = fixture();
    let release;
    backend.focus = () => new Promise(resolve => { release = resolve; });
    const sending = engine.send('abc', ['editor', 'writer']);
    engine.cancel();
    await assert.rejects(engine.send('other', ['editor', 'writer']), /in progress/);
    release();
    await assert.rejects(sending, /Sending stopped/);
});
