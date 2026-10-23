# Driftglass — Diff viewer

See the cut between live and local. A tiny, zero-build VSCode / Cursor
extension that renders diff files as a readable, colored view instead of raw
text: red drops, green adds.

Opens automatically for `*.diff`, `*.patch`, `*.rej`, and `*.helmdiff` files.

## Features

- **Git, unified, and patch diffs.** `diff --git`, `Index:`, `---`/`+++`,
  and `@@` hunk headers are recognized and styled.
- **Helm diffs.** Output from [helm-diff](https://github.com/databus23/helm-diff)
  (`helm diff upgrade … > out.helmdiff`) gets section headers for every
  resource: lines like `default, web, Deployment (apps) has changed:` show in
  blue, and resources that were added or removed show in green or red.
- **Sidebar.** Every file or resource is listed in a sidebar. Click one to
  jump to it.
- **Summary bar.** Counts of added and removed lines, plus the number of
  sections.
- **Live.** The view re-renders when the file changes on disk or in the editor.
- **Theme-aware.** Uses your editor's background, foreground, and border colors.

To see the raw text instead, right-click the tab → *Reopen Editor With…* →
*Text Editor*.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `driftglass.showToc` | `true` | Show the file/resource sidebar. |
| `driftglass.helmResourceHeaders` | `true` | Treat Helm-diff lines like "Deployment has changed" as section headers. |

## Tip: piping a diff

```bash
git diff > /tmp/changes.diff && code /tmp/changes.diff
helm diff upgrade my-release ./chart > /tmp/release.helmdiff && cursor /tmp/release.helmdiff
```

## Install from source

```bash
./install.sh
```

This packages a `.vsix` and installs it into Cursor or VSCode (whichever CLI is
found). Reload the window afterwards.

## License

MIT
