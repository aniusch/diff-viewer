const vscode = require("vscode");

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function helmResourceKind(line, enabled) {
  if (!enabled) return null;
  if (!/has (changed|been added|been removed)/.test(line)) return null;
  if (/been added/.test(line)) return "section add";
  if (/been removed/.test(line)) return "section del";
  return "section";
}

function classifyLine(line, helmHeaders) {
  if (/^diff --git /.test(line)) return "file";
  if (/^Index: /.test(line)) return "file";
  if (/^@@ /.test(line)) return "hunk";
  if (/^--- /.test(line) || /^\+\+\+ /.test(line)) return "meta";
  if (/^\\ No newline at end of file/.test(line)) return "meta";
  if (/^diff -/.test(line)) return "file";
  const helm = helmResourceKind(line, helmHeaders);
  if (helm) return helm;
  if (line.startsWith("+") && !line.startsWith("+++")) return "add";
  if (line.startsWith("-") && !line.startsWith("---")) return "del";
  return "ctx";
}

function gutter(kind) {
  if (kind === "add") return "+";
  if (kind === "del") return "−";
  if (kind.startsWith("section") || kind === "file") return "▸";
  if (kind === "hunk") return "@";
  return " ";
}

function tocLabel(kind, line) {
  if (kind === "file" && /^diff --git /.test(line)) {
    const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    return match ? match[2] : line.slice(11);
  }
  if (kind === "file" && /^Index: /.test(line)) return line.slice(7).trim();
  if (kind.startsWith("section")) return line.replace(/:$/, "");
  if (kind === "hunk") {
    const name = line.replace(/^@@[^@]*@@\s*/, "").trim();
    return name || line;
  }
  return line;
}

function renderHtml(text, settings) {
  const helmHeaders = settings.get("helmResourceHeaders", true);
  const showToc = settings.get("showToc", true);
  const lines = text.split(/\r?\n/);
  const sections = [];
  let added = 0;
  let removed = 0;

  const body = lines
    .map((line, index) => {
      const kind = classifyLine(line, helmHeaders);
      if (kind === "add") added += 1;
      if (kind === "del") removed += 1;
      if (kind === "file" || kind.startsWith("section")) {
        const id = `s${index}`;
        sections.push({ id, label: tocLabel(kind, line), kind });
        return `<div class="line ${kind}" id="${id}"><span class="gutter">${gutter(kind)}</span><span class="txt">${escapeHtml(line)}</span></div>`;
      }
      return `<div class="line ${kind}"><span class="gutter">${gutter(kind)}</span><span class="txt">${escapeHtml(line)}</span></div>`;
    })
    .join("");

  const toc = sections
    .map((item) => `<a class="${item.kind}" href="#${item.id}">${escapeHtml(item.label)}</a>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  html, body { margin: 0; padding: 0; }
  body {
    font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
  }
  .bar {
    position: sticky; top: 0; z-index: 2;
    display: flex; gap: 12px; align-items: center;
    padding: 8px 12px;
    background: var(--vscode-sideBar-background, var(--vscode-editor-background));
    border-bottom: 1px solid var(--vscode-panel-border, #333);
  }
  .stat.add { color: #3fb950; font-weight: 700; }
  .stat.del { color: #f85149; font-weight: 700; }
  .wrap { display: grid; grid-template-columns: ${showToc ? "minmax(220px, 28%) 1fr" : "1fr"}; min-height: 100vh; }
  nav {
    position: sticky; top: 37px; align-self: start;
    max-height: calc(100vh - 37px); overflow: auto;
    padding: 10px 12px;
    border-right: 1px solid var(--vscode-panel-border, #333);
    background: var(--vscode-sideBar-background, transparent);
  }
  nav a {
    display: block; color: inherit; text-decoration: none;
    padding: 4px 0; opacity: 0.85; word-break: break-all;
  }
  nav a:hover { opacity: 1; text-decoration: underline; }
  nav a.add { color: #3fb950; }
  nav a.del { color: #f85149; }
  main { overflow: auto; padding: 8px 0 32px; }
  .line { display: grid; grid-template-columns: 18px 1fr; white-space: pre; }
  .gutter { text-align: center; user-select: none; opacity: 0.9; }
  .txt { padding-right: 12px; }
  .add { background: rgba(46, 160, 67, 0.22); }
  .add .gutter { color: #3fb950; font-weight: 700; }
  .del { background: rgba(248, 81, 73, 0.22); }
  .del .gutter { color: #f85149; font-weight: 700; }
  .section, .file { margin-top: 14px; font-weight: 700; background: rgba(56, 139, 253, 0.12); }
  .section.add, .file.add { background: rgba(46, 160, 67, 0.18); }
  .section.del, .file.del { background: rgba(248, 81, 73, 0.18); }
  .hunk { background: rgba(187, 128, 9, 0.16); color: inherit; font-weight: 600; }
  .meta { opacity: 0.45; }
  .ctx { opacity: 0.78; }
</style>
</head>
<body>
  <div class="bar">
    <span class="stat add">+${added}</span>
    <span class="stat del">−${removed}</span>
    <span>${sections.length} sections</span>
  </div>
  <div class="wrap">
    ${showToc ? `<nav>${toc || "<span>No file/resource headers</span>"}</nav>` : ""}
    <main>${body}</main>
  </div>
</body>
</html>`;
}

class DriftglassEditorProvider {
  async resolveCustomTextEditor(document, webviewPanel) {
    webviewPanel.webview.options = { enableScripts: true };
    const settings = vscode.workspace.getConfiguration("driftglass");

    const update = () => {
      webviewPanel.webview.html = renderHtml(document.getText(), settings);
    };

    update();

    const subs = [
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.toString() === document.uri.toString()) update();
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("driftglass")) update();
      }),
    ];
    webviewPanel.onDidDispose(() => subs.forEach((sub) => sub.dispose()));
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider("driftglass.preview", new DriftglassEditorProvider(), {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
