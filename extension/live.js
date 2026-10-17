// SPDX-License-Identifier: MIT
// An append-only queue. A failed chunk is never retried: delivery may be partial.
export class LiveSession {
    constructor(sender, targets, onChange = () => {}) {
        this.sender = sender;
        this.targets = [...targets];
        this.onChange = onChange;
        this.active = true;
        this.text = '';
        this.pending = '';
        this.flushing = false;
        this.error = null;
    }

    append(character) {
        if (!this.active)
            return;
        if (!/^[\x20-\x7e]$/.test(character))
            throw new Error('Live typing currently supports printable ASCII only.');
        if (this.text.length >= 256)
            throw new Error('Live typing is limited to 256 characters per session.');
        this.text += character;
        this.pending += character;
        this.onChange();
    }

    stop() {
        this.active = false;
        this.pending = '';
        this.sender.cancel();
        this.onChange();
    }

    async flush() {
        if (!this.active || this.flushing || !this.pending)
            return;
        this.flushing = true;
        try {
            while (this.active && this.pending) {
                const chunk = this.pending;
                this.pending = '';
                await this.sender.send(chunk, this.targets);
            }
        } catch (error) {
            this.error = error;
            this.stop();
        } finally {
            this.flushing = false;
            this.onChange();
        }
    }
}
