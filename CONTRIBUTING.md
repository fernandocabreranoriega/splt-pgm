# Contributing to splt-pgm

splt-pgm (Split Program) is an experimental GNOME Shell extension. Contributions
to reliability, application compatibility, accessibility, and tests are welcome.

## Project language

Use English for branch names, identifiers, code comments, documentation, UI text,
error messages, commit messages, issue titles and descriptions, and pull request
titles and descriptions. Unicode test fixtures may include other languages and
characters to exercise input handling. Keep the project name `splt-pgm`.

## Branches and changes

Start from an up-to-date `main`. Use short English branch names:

- `feat/live-typing` for features.
- `fix/focus-loss` for fixes.
- `docs/installation-guide` for documentation.
- `chore/english-language` for maintenance.

Use one repository, branches for changes, `tests/` for automated tests, and version
tags such as `v0.1.0` for releases. The initial `main` contains a prototype and is
not a stable release.

Keep commits focused and write descriptive English messages, such as
`Translate project documentation and interface to English`. Submit a pull request
to `main` describing behavior changes, validation, and remaining limitations.
Do not commit generated ZIP files from `dist/`.

## Validation

Run the checks in [README.md](README.md#development-and-validation). Use disposable
documents for manual tests. For delivery changes, report GNOME and application
versions, keyboard layout, expected and received text, focus loss, and cancellation
behavior. Only claim compatibility with applications and versions actually tested.

Keep user text out of logs and reports. Use synthetic examples instead.
