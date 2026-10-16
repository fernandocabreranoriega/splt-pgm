// SPDX-License-Identifier: MIT
export function validateText(text) {
    if (typeof text !== 'string' || text.length === 0)
        throw new Error('Escribe un texto antes de enviar.');
    if ([...text].length > 256)
        throw new Error('El límite del prototipo es de 256 caracteres.');
    if (/[\u0000-\u001f\u007f-\u009f]/u.test(text))
        throw new Error('Este prototipo solo admite texto en una línea, sin tabuladores.');
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
            throw new Error('Envío detenido; puede haber texto parcial.');
    }

    async send(text, targets) {
        if (this.running)
            throw new Error('Ya hay un envío en curso.');
        const characters = validateText(text);
        if (targets.length < 2 || targets.length > 4 || new Set(targets).size !== targets.length)
            throw new Error('Selecciona entre dos y cuatro ventanas diferentes.');
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
            throw new Error(`${error.message} Ventanas con secuencia enviada completa: ${completed}/${targets.length}. No se verificó el contenido recibido.`, {cause: error});
        } finally {
            this.running = false;
        }
    }
}
