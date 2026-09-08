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
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';

/** The guest reads these back as ordinary input lines; they end the exchange. */
const SAVE_SENTINEL = '__V86_OPEN_SAVE__';
const CANCEL_SENTINEL = '__V86_OPEN_CANCEL__';

export interface EditorOverlayElements {
  root: HTMLElement;
  host: HTMLElement;
  pathLabel: HTMLElement;
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

    this.#elements.saveButton.addEventListener('click', () => this.save());
    this.#elements.cancelButton.addEventListener('click', () => this.cancel());
  }

  /** True while the guest is blocked waiting for this overlay. */
  get isOpen(): boolean {
    return this.#open;
  }

  show(path: string, contents: string): void {
    this.#open = true;
    this.#elements.pathLabel.textContent = path;
    this.#elements.root.hidden = false;

    const state = EditorState.create({
      doc: contents,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        StreamLanguage.define(shell),
        EditorView.lineWrapping,
        keymap.of([
          { key: 'Mod-s', run: () => (this.save(), true), preventDefault: true },
          { key: 'Escape', run: () => (this.cancel(), true) },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.theme({ '&': { height: '100%' }, '.cm-scroller': { overflow: 'auto' } }),
      ],
    });

    this.#view?.destroy();
    this.#view = new EditorView({ state, parent: this.#elements.host });
    this.#view.focus();
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
