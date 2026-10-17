# Live typing investigation

## Status

The `feat/live-typing` branch introduces an append-only delivery queue and a
reproducible keyboard capture probe. It does **not** enable live typing in the
extension UI. The existing batch mode remains available.

## Delivery queue

`extension/live.js` separates incoming text from the delivery backend. It snapshots
the destinations, serializes chunks, queues input that arrives during delivery,
and drops pending input when stopped. A failed chunk is never retried because one
destination might already have received part of it.

The initial queue accepts printable ASCII, with a 256-character limit per session.
It does not yet handle deletion, selection, shortcuts, input methods, or Enter.
The module is a foundation for a future backend, not a complete live input mode.

## Capture limitation

On GNOME Shell/Mutter 50.3 on Wayland, a `captured-event` listener on
`global.stage` did not receive keyboard input addressed to application windows.
The application still received that input. A Shell stage listener alone therefore
cannot capture, suppress, and queue physical typing during focus switching.

The initial live experiment failed its exact-capture integration assertion.
The unverified live UI was removed. Do not expose live input until capture and
delivery can be verified together, including typing during destination changes.

`tests/live-capture-probe.js` reproduces the limitation using synthetic input
in an isolated compositor. It verifies exact batch delivery first, adds a stage
listener, injects one additional key, and checks that exactly one application
received it while the listener recorded zero key presses. It never records real
user input. This is a diagnostic probe, not a compatibility promise across all
GNOME versions.

## Run the probe

Build the extension package first, then run from the repository root:

```bash
python3 tools/package.py
GTK_A11Y=none NO_AT_BRIDGE=1 dbus-run-session -- \
  gnome-shell-test-tool --headless --disable-animations \
  --extra-filter org.community.SpltPgm.TestA \
  --extra-filter org.community.SpltPgm.TestB \
  --extension "$PWD/dist/splt-pgm@local.community.shell-extension.zip" \
  "$PWD/tests/live-capture-probe.js"
```

## Next backend requirements

Investigate compositor-level interception or an explicit input helper that can
distinguish physical input from injected input and intercept it before application
delivery. Assess required permissions before choosing a helper implementation.
A backend must not rely on focus switching alone while the user continues typing.

Before exposing the feature, verify ordered delivery under continuous input,
feedback loop prevention, modifier handling, Escape to stop, focus loss, window
closure, session lock, and full cleanup when disabled. Test actual hardware input
in addition to synthetic events.
