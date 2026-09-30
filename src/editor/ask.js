// In-app replacements for confirm(), prompt() and alert(), which some hosts suppress.

import { el } from './dom.js';

function modal(build) {
  return new Promise((resolve) => {
    const dialog = el('dialog', { class: 'ask-dialog' });
    const done = (value) => {
      dialog.close();
      resolve(value);
    };
    build(dialog, done);
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      done(null);
    });
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
  });
}

/** Yes/no question. Resolves true or false. */
export async function ask(message, { ok = 'OK', cancel = 'Cancel', danger = false } = {}) {
  const answer = await modal((dialog, done) => {
    const yes = el('button', { type: 'button', class: danger ? 'danger primary' : 'primary', onclick: () => done(true) }, ok);
    dialog.append(el('p', {}, message), el('menu', {}, el('button', { type: 'button', onclick: () => done(false) }, cancel), yes));
    queueMicrotask(() => yes.focus());
  });
  return answer === true;
}

/** Ask for a line of text. Resolves the text, or null if cancelled. */
export function askText(message, value = '', { ok = 'OK' } = {}) {
  return modal((dialog, done) => {
    const input = el('input', { type: 'text', id: 'ask-text', value });
    const submit = () => done(input.value.trim() || null);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    dialog.append(
      el('label', { class: 'field', for: 'ask-text' }, el('span', { class: 'field-label' }, message), input),
      el('menu', {}, el('button', { type: 'button', onclick: () => done(null) }, 'Cancel'), el('button', { type: 'button', class: 'primary', onclick: submit }, ok)),
    );
    queueMicrotask(() => {
      input.focus();
      input.select();
    });
  });
}

/** Show a message with an OK button. */
export async function notice(message) {
  await modal((dialog, done) => {
    const ok = el('button', { type: 'button', class: 'primary', onclick: () => done(true) }, 'OK');
    dialog.append(el('p', {}, message), el('menu', {}, ok));
    queueMicrotask(() => ok.focus());
  });
}
