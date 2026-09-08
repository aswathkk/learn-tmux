/**
 * Keeping the terminal's own answers out of the guest's input.
 *
 * When tmux attaches it interrogates the terminal: primary and secondary device
 * attributes, the foreground and background colours, sometimes a version
 * string. xterm.js answers those queries through the same `onData` callback
 * that carries the learner's keystrokes, and everything on that callback goes
 * down the serial line as input.
 *
 * When the answer arrives a moment after tmux has handed control to the pane,
 * the shell inside the pane gets it instead, and the learner is left staring at
 * a prompt reading `0;276;0cc9/d2d28808/0a0a` with their command on the end of
 * it. The command then fails, and the lesson can never pass.
 *
 * These are replies, not input: nobody types a device-attributes response. So
 * they are dropped on the way out. tmux falls back to terminfo for
 * xterm-256color, which is exactly what xterm.js implements.
 *
 * Cursor position reports (CSI row ; col R) are filtered for the same reason:
 * tmux queries the cursor on attach, and the reply lands in the learner's pane
 * as a visible `^[[1;3R`. Nothing in the guest is worse off without them —
 * tmux falls back to terminfo and busybox assumes a sane default.
 */

/** Terminal replies that must never reach the guest as input. */
const REPORT_PATTERNS: RegExp[] = [
  // Primary and secondary device attributes: ESC [ ? … c   /   ESC [ > … c
  /\x1b\[[?>][0-9;]*c/g,
  // Tertiary device attributes and XTVERSION, both DCS-wrapped:
  // ESC P ! | <hex> ESC \    and    ESC P > | <text> ESC \
  /\x1bP[!>]\|[^\x1b]*\x1b\\/g,
  // Colour and palette reports: ESC ] <n> ; rgb:<...> BEL-or-ST
  /\x1b\][0-9]+;rgb:[0-9a-fA-F/]*(?:\x07|\x1b\\)/g,
  // Cursor position report: ESC [ <row> ; <col> R. Two numeric parameters and
  // an R, which no key on a keyboard produces.
  /\x1b\[[0-9]+;[0-9]+R/g,
  // Any other OSC reply that came back with a colour spec but no terminator yet
  // is left alone; a partial sequence is handled by the next chunk.
];

/**
 * Strip terminal report sequences from data heading for the guest.
 *
 * Returns the input unchanged when there is nothing to strip, which is the
 * common case: this runs on every keystroke.
 */
export function stripTerminalReports(data: string): string {
  // Fast path. Reports always begin with ESC, and ordinary typing has none.
  if (!data.includes('\x1b')) return data;

  let result = data;
  for (const pattern of REPORT_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, '');
  }
  return result;
}
