// Grouped tools: one toolbar button holding several related tools as modes (Room: rectangle,
// circle, polygon, cave, paint, type). The old single-letter keys pick the mode directly.

import { el, segmented } from '../dom.js';

export function groupedTool({ id, label, key, optKey, modes, hint }) {
  const current = (app) => (modes.find((m) => m.id === app.opts[optKey]) || modes[0]);
  const inner = (app) => current(app).tool;
  const forward = (name) => function (app, ...args) {
    if (!app) return modes.forEach((m) => m.tool[name]?.call(m.tool));
    const t = inner(app);
    return t[name]?.call(t, app, ...args);
  };
  return {
    id,
    label,
    key,
    hint,
    modes,
    inner,
    /** Switch mode (from a key or the panel), cancelling whatever the old mode was doing. */
    setMode(app, modeId) {
      if (app.opts[optKey] === modeId) return;
      inner(app).cancel?.(app);
      app.setOpt(optKey, modeId);
      app.canvas.dataset.tool = inner(app).id;
      app.requestRender();
    },
    hintFor: (app) => inner(app).hint,
    options(app) {
      const t = inner(app);
      return el('div', {},
        segmented(modes.map((m) => ({ id: m.id, name: m.name, title: m.key ? `Key ${m.key.toUpperCase()}` : '' })), current(app).id, (v) => this.setMode(app, v)),
        t.options?.(app));
    },
    down: forward('down'),
    move: forward('move'),
    up: forward('up'),
    dblclick: forward('dblclick'),
    onKey: forward('onKey'),
    cancel: forward('cancel'),
    overlay: forward('overlay'),
    finish: forward('finish'),
  };
}
