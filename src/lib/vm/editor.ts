/**
 * The overlay behind the guest's `open` command.
 *
 * `open FILE` in the guest hands the file to the browser and then blocks
 * reading the tty until the editor closes. That is why this overlay is modal:
 * any keystroke that reached the terminal while it is up would be swallowed by
 * the blocked `open` instead of going where the learner meant it.
 *
 * It exists because busybox `vi` is workable but unpleasant, and Alpine's `vim`
 * package is 35.7 MB against a 2.8 MB rootfs.
 */
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { shell } from '@codemirror/legacy-modes/mode/shell';

/**
 * CodeMirror ships no theme of its own, so an unstyled editor renders in its
 * light default — a white gutter and a pale blue active line inside a terminal.
 * Everything here reads from the brand tokens in global.css instead.
 *
 * The chrome is painted by the overlay markup; this is only what lives inside
 * the scroller, so the surface stays transparent and the box below shows
 * through.
 */
const theme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
      color: 'var(--color-term)',
      fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '13px',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
      lineHeight: '1.55',
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--color-fg-faintest) transparent',
    },
    '.cm-content': { padding: '10px 0 40px', caretColor: 'var(--color-accent)' },
    '.cm-line': { padding: '0 14px' },

    /* A rule, not a panel: the numbers are a margin note on the file, so the
       gutter carries no fill of its own. */
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--color-ring)',
      border: 'none',
      borderRight: '1px solid var(--color-line-faint)',
      paddingRight: '2px',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 12px', minWidth: '34px' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--color-fg-dim)' },
    '.cm-activeLine': { backgroundColor: 'rgb(255 255 255 / 0.035)' },

    '.cm-cursor, .cm-dropCursor': {
      borderLeft: '2px solid var(--color-accent)',
      marginLeft: '-1px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--color-term-selection)',
    },
  },
  { dark: true },
);

/**
 * The same three levels the lesson code blocks use, for the same reason: this
 * is a terminal, and Phosphor is reserved for progress and live state, which
 * syntax highlighting is neither.
 *
 *     set -g history-limit 50000
 *     ^^^ command          ^^^^^ value
 *         ^^ ^^^^^^^^^^^^^ flag and option name
 *
 * The command is brightest, flags and option names sit at body weight, and the
 * value carries the one hue — because the value is the part a reader opened the
 * file to change.
 */
const highlight = HighlightStyle.define(
  [
    { tag: tags.comment, color: 'var(--color-fg-dim)', fontStyle: 'italic' },
    { tag: [tags.keyword, tags.standard(tags.variableName)], color: 'var(--color-fg)' },
    { tag: tags.attributeName, color: 'var(--color-fg-muted)' },
    {
      tag: [tags.string, tags.special(tags.string), tags.number, tags.atom],
      color: 'var(--color-hint)',
    },
    { tag: [tags.operator, tags.punctuation, tags.bracket], color: 'var(--color-fg-dim)' },
    { tag: [tags.variableName, tags.definition(tags.variableName)], color: 'var(--color-fg-muted)' },
    { tag: tags.meta, color: 'var(--color-fg-dim)' },
  ],
  { themeType: 'dark' },
);

/** `Mod-s` is `⌘S` on a Mac and `Ctrl-S` everywhere else; the keycap says which. */
const SAVE_KEY_LABEL = /mac|iphone|ipad/i.test(
  typeof navigator === 'undefined' ? '' : navigator.userAgent,
)
  ? '\u2318S'
  : 'Ctrl-S';

/** The guest reads these back as ordinary input lines; they end the exchange. */
const SAVE_SENTINEL = '__V86_OPEN_SAVE__';
const CANCEL_SENTINEL = '__V86_OPEN_CANCEL__';

export interface EditorOverlayElements {
  root: HTMLElement;
  host: HTMLElement;
  pathLabel: HTMLElement;
  /** The unsaved-changes marker, shown once the buffer stops matching the file. */
  dirtyFlag: HTMLElement;
  saveKeyLabel: HTMLElement;
  saveButton: HTMLElement;
  cancelButton: HTMLElement;
}

export interface EditorOverlayOptions {
  elements: EditorOverlayElements;
  /** Writes a line to the guest's terminal input. */
  send(text: string): void;
  /** Called after the overlay closes, so focus can return to the terminal. */
  onClose(): void;
}

export class EditorOverlay {
  #elements: EditorOverlayElements;
  #send: EditorOverlayOptions['send'];
  #onClose: EditorOverlayOptions['onClose'];
  #view: EditorView | null = null;
  #open = false;

  constructor(options: EditorOverlayOptions) {
    this.#elements = options.elements;
    this.#send = options.send;
    this.#onClose = options.onClose;

    this.#elements.saveKeyLabel.textContent = SAVE_KEY_LABEL;
    this.#elements.saveButton.addEventListener('click', () => this.save());
    this.#elements.cancelButton.addEventListener('click', () => this.cancel());
  }

  /** True while the guest is blocked waiting for this overlay. */
  get isOpen(): boolean {
    return this.#open;
  }

  show(path: string, contents: string): void {
    this.#open = true;
    this.#showPath(path);
    this.#elements.dirtyFlag.hidden = true;
    this.#elements.root.hidden = false;

    const state = EditorState.create({
      doc: contents,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        history(),
        StreamLanguage.define(shell),
        syntaxHighlighting(highlight),
        EditorView.lineWrapping,
        keymap.of([
          { key: 'Mod-s', run: () => (this.save(), true), preventDefault: true },
          { key: 'Escape', run: () => (this.cancel(), true) },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        // Once is enough: this runs on every keystroke, and writing `hidden`
        // that is already false still invalidates style on the element.
        EditorView.updateListener.of((update) => {
          if (update.docChanged && this.#elements.dirtyFlag.hidden) {
            this.#elements.dirtyFlag.hidden = false;
          }
        }),
        theme,
      ],
    });

    this.#view?.destroy();
    this.#view = new EditorView({ state, parent: this.#elements.host });
    this.#view.focus();
  }

  /** The directory dims back so the file name is what the eye lands on. */
  #showPath(path: string): void {
    const cut = path.lastIndexOf('/');
    const dir = document.createElement('span');
    dir.className = 'text-fg-faint';
    dir.textContent = path.slice(0, cut + 1);
    const name = document.createElement('span');
    name.textContent = path.slice(cut + 1);
    this.#elements.pathLabel.replaceChildren(dir, name);
  }

  #close(): void {
    this.#open = false;
    this.#elements.root.hidden = true;
    this.#view?.destroy();
    this.#view = null;
    this.#onClose();
  }

  save(): void {
    if (!this.#open || !this.#view) return;
    const text = this.#view.state.doc.toString().replace(/\n$/, '');
    const lines = text === '' ? [] : text.split('\n');
    this.#close();
    this.#sendLines(lines, () => this.#send(SAVE_SENTINEL + '\r'));
  }

  cancel(): void {
    if (!this.#open) return;
    this.#close();
    this.#send(CANCEL_SENTINEL + '\r');
  }

  /**
   * The guest reads the file back line by line through a tty in canonical mode,
   * so the lines go out in small pieces rather than as one burst into a line
   * buffer that would drop the overflow.
   */
  #sendLines(lines: string[], done: () => void): void {
    let index = 0;
    const step = (): void => {
      if (index >= lines.length) {
        done();
        return;
      }
      this.#send(lines[index++] + '\r');
      setTimeout(step, 4);
    };
    step();
  }
}
