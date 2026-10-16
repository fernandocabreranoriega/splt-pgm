// SPDX-License-Identifier: MIT
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {Broadcaster} from './core.js';

export default class SpltPgm extends Extension {
    enable() {
        this._enabled = false;
        this._selected = new Set();
        this._timers = new Map();
        this._draft = '';
        this._keyboard = global.stage.context.get_backend().get_default_seat()
            .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
        this._engine = new Broadcaster({
            validateTarget: window => this._validateTarget(window),
            focus: window => this._focus(window),
            assertReady: window => this._assertReady(window),
            tap: keyval => this._tap(keyval),
            delay: ms => this._delay(ms),
        });
        this._button = new PanelMenu.Button(0.0, 'splt-pgm');
        this._label = new St.Label({text: '⇉', y_align: Clutter.ActorAlign.CENTER});
        this._button.add_child(this._label);
        this._button.menu.connect('open-state-changed', (_menu, open) => {
            if (open)
                this._rebuildMenu();
        });
        Main.panel.addToStatusArea(this.uuid, this._button);
        this._enabled = true;
    }

    _windows() {
        return global.display.get_tab_list(Meta.TabList.NORMAL_ALL, null)
            .filter(window => window.get_window_type() === Meta.WindowType.NORMAL &&
                window.get_workspace() === global.workspace_manager.get_active_workspace() &&
                !window.minimized && !window.skip_taskbar);
    }

    _validateTarget(window) {
        if (!this._enabled || !this._windows().includes(window))
            throw new Error('Una ventana se cerró, se minimizó o salió del espacio activo.');
    }

    _assertReady(window) {
        this._validateTarget(window);
        if (Main.sessionMode.isLocked || Main.overview.visible || Main.modalCount > 0)
            throw new Error('El escritorio tiene un diálogo, la vista general o está bloqueado.');
        if (global.display.focus_window !== window)
            throw new Error('Cambió el foco.');
        const modifiers = global.get_pointer()[2];
        const blocked = Clutter.ModifierType.SHIFT_MASK |
            Clutter.ModifierType.CONTROL_MASK | Clutter.ModifierType.MOD1_MASK |
            Clutter.ModifierType.SUPER_MASK | Clutter.ModifierType.META_MASK;
        if (modifiers & blocked)
            throw new Error('Suelta las teclas modificadoras antes de enviar.');
    }

    _delay(ms) {
        return new Promise((resolve, reject) => {
            const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
                this._timers.delete(id);
                resolve();
                return GLib.SOURCE_REMOVE;
            });
            this._timers.set(id, reject);
        });
    }

    async _focus(window) {
        this._validateTarget(window);
        window.activate(global.get_current_time());
        // Focus acquisition is asynchronous. Poll only until it is confirmed;
        // assertReady() checks it again immediately before every key pair.
        for (let attempt = 0; attempt < 30; attempt++) {
            await this._delay(25);
            this._engine.check();
            if (global.display.focus_window === window) {
                await this._delay(75);
                this._assertReady(window);
                return;
            }
        }
        throw new Error('No se pudo enfocar una ventana de destino.');
    }

    _tap(keyval) {
        const time = GLib.get_monotonic_time();
        try {
            this._keyboard.notify_keyval(time, keyval, Clutter.KeyState.PRESSED);
        } finally {
            this._keyboard.notify_keyval(time, keyval, Clutter.KeyState.RELEASED);
        }
    }

    _rebuildMenu() {
        const menu = this._button.menu;
        menu.removeAll();
        if (this._engine.running) {
            menu.addAction('Detener envío', () => this._engine.cancel());
            return;
        }
        menu.addMenuItem(new PopupMenu.PopupMenuItem('splt-pgm · prototipo por lotes', {reactive: false}));
        const windows = this._windows();
        this._selected = new Set([...this._selected].filter(window => windows.includes(window)));
        for (const window of windows) {
            const item = new PopupMenu.PopupSwitchMenuItem(
                (window.get_title() || 'Sin título').slice(0, 80), this._selected.has(window));
            item.connect('toggled', (_item, state) => {
                if (state)
                    this._selected.add(window);
                else
                    this._selected.delete(window);
            });
            menu.addMenuItem(item);
        }
        if (windows.length < 2)
            menu.addMenuItem(new PopupMenu.PopupMenuItem('Abre dos ventanas en este espacio.', {reactive: false}));
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const entryItem = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        const entry = new St.Entry({
            hint_text: 'Texto común (una línea, máximo 256)',
            text: this._draft,
            can_focus: true,
            x_expand: true,
            style: 'min-width: 340px;',
        });
        entry.clutter_text.connect('text-changed', () => { this._draft = entry.get_text(); });
        entryItem.add_child(entry);
        menu.addMenuItem(entryItem);
        menu.addAction('Enviar texto a las ventanas seleccionadas', () => {
            this._button.menu.close();
            void this._send();
        });
    }

    async _send() {
        if (this._engine.running || this._pending)
            return;
        this._pending = true;
        const engine = this._engine;
        const text = this._draft;
        const targets = [...this._selected];
        this._label.set_text('⇉ …');
        try {
            await this._delay(200); // Allow popup grab and activating click to end.
            const result = await engine.send(text, targets);
            if (this._enabled && this._engine === engine)
                Main.notify('splt-pgm', `Secuencia enviada a ${result.completed} ventanas. Comprueba el texto recibido.`);
        } catch (error) {
            if (this._enabled && this._engine === engine)
                Main.notify('splt-pgm · envío detenido', error.message);
        } finally {
            if (this._engine === engine) {
                this._pending = false;
                if (this._enabled)
                    this._label.set_text('⇉');
            }
        }
    }

    disable() {
        this._enabled = false;
        this._engine?.cancel();
        for (const [id, reject] of this._timers ?? []) {
            GLib.source_remove(id);
            reject(new Error('Extensión desactivada.'));
        }
        this._timers?.clear();
        this._button?.destroy();
        this._button = null;
        this._keyboard = null;
        this._draft = '';
        this._selected?.clear();
        this._pending = false;
    }
}
