# splt-pgm (Split Program)

An experimental GNOME Shell 50 extension that sends the same text to windows
belonging to different applications on Wayland. Licensed under MIT.

## Current behavior

Select two to four windows in the active workspace, enter one line in the
splt-pgm menu, and click **Send text to selected windows**. The extension activates
each destination, checks focus, and simulates its key sequence.

**Delivery is sequential and batch-based. Live keyboard mirroring while typing
directly into another application is not implemented yet.**

No root access, keyboard service, or Mutter modification is required. The
extension does not use the clipboard, network, or files to store text. The draft
stays in memory while enabled. There is no global keyboard capture.

## Installation on Arch Linux

From your checkout, build with Python 3 (no additional Python dependencies):

```bash
cd splt-pgm
python3 tools/package.py
gnome-extensions install dist/splt-pgm@local.community.shell-extension.zip
```

Log out and back in so GNOME discovers the extension, then enable it:

```bash
gnome-extensions enable splt-pgm@local.community
```

For updates, disable the extension, install with
`gnome-extensions install --force PATH_TO_ZIP`, then log out and back in before
enabling it. Keep GNOME's extension version validation enabled.

## First manual test

1. Open two disposable documents, for example in a text editor and LibreOffice
   Writer, in the same workspace. Keep both windows unminimized.
2. Click the intended text field in each window to position its caret.
3. Open **⇉** in the top bar and select both windows.
4. Enter `Hello 123` and click **Send text to selected windows**.
5. Avoid typing or switching windows during delivery. Check both documents:
   the notification confirms the sequence was sent, not received.

To interrupt, open the menu and click **Stop sending**. Detected focus changes,
Shell dialogs, held modifiers, session locking, or a closed target stop delivery.
Partial text may remain; there is no automatic retry or undo. To disable:

```bash
gnome-extensions disable splt-pgm@local.community
```

## Known limitations

- Only one line of up to 256 characters. Enter, Tab, Backspace, shortcuts,
  formatting, mouse actions, and selection changes are not sent.
- The internal text field is not identified. Position each caret before sending.
  Field changes within the same window are not detected.
- Focus moves sequentially and remains on the last destination.
- Delivery depends on keyboard maps, lock modifiers, and input methods. Accents,
  characters outside the map, and emoji need real application tests. Conversion
  to a keysym does not guarantee reception.
- Events are asynchronous: a queued event might arrive after focus changes.
- Start with disposable documents and ordinary fields. Password fields and field
  semantics are not detected.
- Universal compatibility with LibreOffice, VS Code, browsers, Electron, or
  XWayland applications has not been established.
- Only GNOME 50 is declared as supported. Other versions require review and tests.

## Development and validation

```bash
node tests/core.test.js
node tests/live.test.js
node --check extension/extension.js
python3 tools/package.py
```

Unit tests cover Unicode sequences, destination validation, cancellation, focus
changes, and concurrent sends. Their simulated backend does not test reception.

Run integration tests in a disposable session with GNOME development tools and
an environment that permits starting a compositor:

```bash
GTK_A11Y=none NO_AT_BRIDGE=1 dbus-run-session -- \
  gnome-shell-test-tool --headless --disable-animations \
  --extra-filter org.community.SpltPgm.TestA \
  --extra-filter org.community.SpltPgm.TestB \
  --extension "$PWD/dist/splt-pgm@local.community.shell-extension.zip" \
  "$PWD/tests/shell-smoke.js"
```

This installs into temporary directories and creates a separate compositor. It
does not enable the extension in your regular session. The smoke test checks
loading, menu construction, target activation, exact reception of `Hello 123` in
separate GTK3 and GTK4 processes, and cleanup. Both GTK bindings for GJS are
required. Distinguish D-Bus and client startup failures from extension failures.

Initial validation on October 16, 2026, before the rename and English translation:
six unit tests and a smoke test passed on GNOME Shell/Mutter 50.3. The original
smoke test used `Hola 123`. Auxiliary service warnings and a Mutter window stacking
assertion did not prevent exact reception or exit code 0. Manual LibreOffice,
VS Code, and real Unicode input tests remain pending.

For diagnostics:

```bash
gnome-extensions info splt-pgm@local.community
journalctl --user -b -o cat
```

Report GNOME and application versions, distribution, keyboard layout, steps, and
actual results. Use sample text and review logs before sharing them.

## Roadmap

The append-only queue and the capture backend investigation are documented in
[Live typing investigation](docs/live-typing.md). The queue is not enabled in the
extension UI; batch delivery remains the available input mode.

1. Confirm exact delivery across applications and keyboard layouts.
2. Add a persistent composer with ordered edit delivery; investigate input
   methods, selections, and Backspace.
3. Investigate Mutter integration for mirroring without switching focus.
   No direct mirroring backend is implemented.
4. Add preferences, translations, accessibility tests, and distribution packaging
   after validating behavior.

## Contributing and releases

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and English conventions.
Choose a permanent extension UUID and record compatibility tests before a wider
release; the current UUID is provisional. The ZIP in `dist/` does not imply
approval by extensions.gnome.org or inclusion in Arch Linux repositories.

Contributions should include reproduction steps and explain focus loss,
cancellation, and disable behavior. Do not log user text or introduce global
keyboard capture without first discussing its scope.

References: [GNOME extensions](https://gjs.guide/extensions/),
[porting to GNOME 50](https://gjs.guide/extensions/upgrading/gnome-shell-50.html),
[Meta.Window.activate](https://mutter.gnome.org/meta/method.Window.activate.html),
[Clutter.VirtualInputDevice](https://mutter.gnome.org/clutter/class.VirtualInputDevice.html).
