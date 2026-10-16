// Test fixture only: writes its own entry contents to the supplied temp file.
import GLib from 'gi://GLib';

const [version, id, output] = ARGV;
const {default: Gtk} = await import(`gi://Gtk?version=${version}`);
const app = new Gtk.Application({application_id: id});
app.connect('activate', () => {
    const window = new Gtk.ApplicationWindow({application: app, title: id,
        default_width: 400, default_height: 160});
    const entry = new Gtk.Entry();
    entry.connect('changed', () => GLib.file_set_contents(output, entry.get_text()));
    GLib.file_set_contents(output, '');
    if (version === '3.0') {
        window.add(entry);
        window.show_all();
    } else {
        window.set_child(entry);
        window.present();
    }
    entry.grab_focus();
});
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30000, () => {
    app.quit();
    return GLib.SOURCE_REMOVE;
});
app.run([]);
