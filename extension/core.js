// SPDX-License-Identifier: MIT
export function validateText(text) {
    if (typeof text !== 'string' || text.length === 0)
        throw new Error('Enter some text before sending.');
    if ([...text].length > 256)
        throw new Error('The prototype is limited to 256 characters.');
    if (/[\u0000-\u001f\u007f-\u009f]/u.test(text))
        throw new Error('This prototype only accepts a single line without tabs.');
    return [...text];
}

export function toKeyval(character) {
    const point = character.codePointAt(0);
    return point <= 0xff ? point : 0x01000000 + point;
}

// The backend owns focus, event delivery and cancellable timers. This engine
// never logs text and never retries a partially delivered batch.
export class Broadcaster {
    constructor(backend) {
        this.backend = backend;
        this.running = false;
        this.cancelled = false;
    }

    cancel() {
        this.cancelled = true;
    }

    check() {
        if (this.cancelled)
            throw new Error('Sending stopped; some text may have been delivered.');
    }

    async send(text, targets) {
        if (this.running)
            throw new Error('A send operation is already in progress.');
        const characters = validateText(text);
        if (targets.length < 2 || targets.length > 4 || new Set(targets).size !== targets.length)
            throw new Error('Select between two and four different windows.');
        this.running = true;
        this.cancelled = false;
        let completed = 0;
        try {
            // Validate every destination before modifying the first one.
            for (const target of targets)
                this.backend.validateTarget(target);
            for (const target of targets) {
                this.check();
                this.backend.validateTarget(target);
                await this.backend.focus(target);
                this.check();
                this.backend.assertReady(target);
                for (const character of characters) {
                    this.check();
                    this.backend.assertReady(target);
                    this.backend.tap(toKeyval(character));
                    // Let Mutter and clients consume each press/release pair.
                    await this.backend.delay(12);
                }
                completed++;
            }
            return {completed};
        } catch (error) {
            throw new Error(`${error.message} Windows with the full sequence sent: ${completed}/${targets.length}. Received content was not verified.`, {cause: error});
        } finally {
            this.running = false;
        }
    }
}
