// Run only in an isolated session with gnome-shell-test-tool --headless.
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export const METRICS = {};

export async function run() {
    await Scripting.sleep(1500);
    const extension = Main.extensionManager.lookup('splt-pgm@local.community');
    const instance = extension?.stateObj;
    if (!instance?._enabled)
        throw new Error(`Extension did not enable: ${JSON.stringify(extension?.error)}`);
    Main.overview.hide();
    await Scripting.sleep(300);
    instance._button.menu.open();
    await Scripting.sleep(100);
    instance._button.menu.close();
    const temp = GLib.dir_make_tmp('splt-pgm-test-XXXXXX');
    const fixture = Gio.File.new_for_uri(import.meta.url).get_parent()
        .get_child('gtk-client.js').get_path();
    const launcher = new Gio.SubprocessLauncher({flags: Gio.SubprocessFlags.NONE});
    launcher.setenv('WAYLAND_DISPLAY', 'gnome-shell-test-display', true);
    launcher.setenv('GDK_BACKEND', 'wayland', true);
    launcher.setenv('GTK_A11Y', 'none', true);
    launcher.setenv('NO_AT_BRIDGE', '1', true);
    const clients = [
        launcher.spawnv(['gjs', '-m', fixture, '3.0', 'org.community.SpltPgm.TestA', `${temp}/a`]),
        launcher.spawnv(['gjs', '-m', fixture, '4.0', 'org.community.SpltPgm.TestB', `${temp}/b`]),
    ];
    try {
    let targets;
    for (let i = 0; i < 50; i++) {
        targets = instance._windows();
        if (targets.length === 2) break;
        await Scripting.sleep(100);
    }
    if (targets.length !== 2)
        throw new Error(`Expected two test windows, got ${targets.length}`);
    instance._rebuildMenu();
    await Scripting.sleep(200);
    const text = 'Hola 123';
    const result = await instance._engine.send(text, targets);
    if (result.completed !== 2)
        throw new Error('Both sequences must complete');
    await Scripting.sleep(200);
    for (const name of ['a', 'b']) {
        const [ok, bytes] = GLib.file_get_contents(`${temp}/${name}`);
        const received = new TextDecoder().decode(bytes);
        if (!ok || received !== text)
            throw new Error(`Client ${name}: expected ${JSON.stringify(text)}, got ${JSON.stringify(received)}`);
    }
    instance.disable();
    if (instance._timers.size !== 0)
        throw new Error('Timers leaked on disable');
    print('SPLT_PGM_SMOKE_PASS: GNOME 50, menu, identical received text in GTK3 and GTK4 clients, cleanup.');
    } finally {
        for (const client of clients) client.force_exit();
        for (const name of ['a', 'b']) GLib.unlink(`${temp}/${name}`);
        GLib.rmdir(temp);
    }
}
