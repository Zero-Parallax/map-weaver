// Tiny DOM helpers.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k in node && typeof v !== 'string') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function select(options, value, onChange, attrs = {}) {
  return el(
    'select',
    { ...attrs, onchange: (e) => onChange(e.target.value) },
    options.map((o) => el('option', { value: o.id, selected: o.id === value }, o.name)),
  );
}

export function field(label, control, hint) {
  return el('label', { class: 'field' }, el('span', { class: 'field-label' }, label), control, hint && el('small', {}, hint));
}

export function segmented(options, value, onChange) {
  return el(
    'div',
    { class: 'segmented' },
    options.map((o) =>
      el('button', {
        type: 'button', class: o.id === value ? 'on' : '', title: o.title || '',
        onclick: (e) => {
          for (const b of e.currentTarget.parentNode.children) b.classList.toggle('on', b === e.currentTarget);
          onChange(o.id);
        },
      }, o.name),
    ),
  );
}

export function checkbox(label, checked, onChange, title) {
  return el(
    'label',
    { class: 'check', title },
    el('input', { type: 'checkbox', checked, onchange: (e) => onChange(e.target.checked) }),
    label,
  );
}
