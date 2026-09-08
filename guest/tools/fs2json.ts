#!/usr/bin/env bun
/**
 * fs2json.ts — TypeScript/Bun port of v86's tools/fs2json.py (github.com/copy/v86).
 *
 * Reads a tar of a root filesystem (as produced by `docker export`) and writes
 * `fs.json`: the inode tree that libv86's 9p filesystem loads at boot.
 *
 * Usage:
 *   bun run guest/tools/fs2json.ts --out <fs.json> <rootfs.tar>
 *
 * Deliberately NOT ported from the Python original (see the report in the repo
 * history / build.sh for why none of these are needed here):
 *   - The directory-input mode (`handle_dir`): the build always feeds a tar, so
 *     this port accepts a tar file only and errors out on a directory.
 *   - `--zstd` / the `.bin.zst` naming: the build ships uncompressed `.bin`
 *     blobs, so compression is rejected rather than silently ignored.
 *   - `--exclude`: only meaningful for the directory mode, so it is rejected.
 *   - GNU sparse-file members ('S' + GNU.sparse.* pax records): `docker export`
 *     never emits them; they are rejected loudly instead of parsed wrong.
 *
 * Everything else is byte-for-byte compatible with the Python output, including
 * Python's `json.dump(..., ensure_ascii=True, separators=(',', ':'))` encoding.
 *
 * Notes carried over from the Python original:
 *   - Hardlinks are copied (each link gets its own inode pointing at the same
 *     content blob).
 *   - The size of symlinks and directories is meaningless; it is whatever the
 *     tar file reports.
 */

import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";

const VERSION = 3;

/**
 * v86 inode layout. Each node in fs.json is a positional array, not an object,
 * because the tree is huge and key names would dominate the download size:
 *
 *   [ name, size, mtime, mode, uid, gid, target? ]
 *
 * The 7th slot is overloaded by node type:
 *   - directory: an array of child nodes
 *   - symlink:   the link target as a string
 *   - file:      the name of the content blob, "<sha256[:10]>.bin"
 * It is omitted entirely when there is nothing to store (Python pops trailing
 * `None`s off the list before serialising), which is how unsupported node types
 * such as fifos and device nodes end up as 6-element arrays.
 *
 * (The Python original spells these positions out as IDX_NAME=0 .. IDX_GID=5
 * and IDX_TARGET/IDX_FILENAME=6; this port uses the named fields of `FsNode`
 * below, declared in the same order, and serialises them positionally.)
 */

/**
 * Length of the sha256 hex prefix used to name content blobs.
 *
 * MUST stay in sync with HASH_LENGTH in copy-to-sha256.ts (and with the Python
 * originals): fs2json writes the blob names into fs.json and copy-to-sha256
 * writes the blobs, so if the two ever disagree every file in the guest becomes
 * a dangling reference.
 *
 * 10 hex chars = 40 bits. That is short enough to keep fs.json small (the name
 * is repeated once per regular file) while leaving a birthday bound around 2^20
 * distinct files before a collision is likely — a rootfs has ~10^3-10^4. A real
 * collision is detected and raised rather than silently corrupting the image.
 */
const HASH_LENGTH = 10;

// File type bits OR'd into the mode. tar headers only carry permission bits, so
// the type has to be reconstructed from the tar typeflag.
const S_IFLNK = 0xa000;
const S_IFREG = 0x8000;
const S_IFDIR = 0x4000;

// ---------------------------------------------------------------------------
// Minimal tar reader: POSIX ustar + GNU long name/link + pax extended headers.
//
// Written inline rather than pulled from npm so the build needs nothing but
// Bun. It mirrors CPython's tarfile module closely, because "byte-exact with
// the Python tool" really means "agrees with tarfile on every field".
// Keep in sync with the copy of this reader in copy-to-sha256.ts.
// ---------------------------------------------------------------------------

const BLOCKSIZE = 512;

// tar typeflag byte values
const REGTYPE = 0x30; // '0'  regular file
const AREGTYPE = 0x00; // '\0' regular file (old V7 format)
const LNKTYPE = 0x31; // '1'  hard link
const SYMTYPE = 0x32; // '2'  symbolic link
const CHRTYPE = 0x33; // '3'  character device
const BLKTYPE = 0x34; // '4'  block device
const DIRTYPE = 0x35; // '5'  directory
const FIFOTYPE = 0x36; // '6'  fifo
const CONTTYPE = 0x37; // '7'  contiguous file
const XHDTYPE = 0x78; // 'x'  pax extended header (next member only)
const XGLTYPE = 0x67; // 'g'  pax global header
const SOLARIS_XHDTYPE = 0x58; // 'X'
const GNUTYPE_LONGNAME = 0x4c; // 'L'  next member's name follows as data
const GNUTYPE_LONGLINK = 0x4b; // 'K'  next member's linkname follows as data
const GNUTYPE_SPARSE = 0x53; // 'S'

const REGULAR_TYPES = new Set([REGTYPE, AREGTYPE, CONTTYPE, GNUTYPE_SPARSE]);
const SUPPORTED_TYPES = new Set([
  REGTYPE, AREGTYPE, LNKTYPE, SYMTYPE, DIRTYPE, FIFOTYPE,
  CONTTYPE, CHRTYPE, BLKTYPE, GNUTYPE_LONGNAME, GNUTYPE_LONGLINK, GNUTYPE_SPARSE,
]);
const GNU_TYPES = new Set([GNUTYPE_LONGNAME, GNUTYPE_LONGLINK, GNUTYPE_SPARSE]);

/** One archive member, with the fields CPython's TarInfo exposes. */
interface TarMember {
  name: string;
  mode: number;
  uid: number;
  gid: number;
  size: number;
  mtime: number;
  /** True when mtime came from a pax record: CPython parses those as float. */
  mtimeIsFloat: boolean;
  type: number;
  linkname: string;
  /** Offset of the member's payload in the archive buffer. */
  dataOffset: number;
  /** Offset of the member's (first) header block; used to order hardlinks. */
  headerOffset: number;
}

interface TarArchive {
  buf: Buffer;
  members: TarMember[];
}

const isReg = (m: TarMember): boolean => REGULAR_TYPES.has(m.type);
const isHardLink = (m: TarMember): boolean => m.type === LNKTYPE;
const isSymLink = (m: TarMember): boolean => m.type === SYMTYPE;
const isDir = (m: TarMember): boolean => m.type === DIRTYPE;

/** Round a byte count up to a whole number of 512-byte blocks. */
function blockRound(count: number): number {
  if (count < 0) throw new Error(`invalid tar member size: ${count}`);
  return Math.ceil(count / BLOCKSIZE) * BLOCKSIZE;
}

/**
 * CPython tarfile's `nti`: decode a numeric header field. Fields are normally
 * NUL/space terminated octal, but GNU tar switches to base-256 (high bit of the
 * first byte set) for values that do not fit.
 */
function nti(field: Buffer): number {
  const first = field[0]!;
  if (first === 0o200 || first === 0o377) {
    let n = 0;
    for (let i = 1; i < field.length; i++) n = n * 256 + field[i]!;
    if (first === 0o377) n = -(Math.pow(256, field.length - 1) - n);
    return n;
  }
  const text = asciiUntilNul(field).trim();
  if (text === "") return 0;
  if (!/^[0-7]+$/.test(text)) throw new Error(`invalid tar header number: ${JSON.stringify(text)}`);
  return parseInt(text, 8);
}

function asciiUntilNul(field: Buffer): string {
  const end = field.indexOf(0);
  return field.toString("latin1", 0, end === -1 ? field.length : end);
}

const STRICT_UTF8 = new TextDecoder("utf-8", { fatal: true });

/**
 * CPython tarfile's `nts`: truncate at the first NUL, then decode as UTF-8 with
 * the `surrogateescape` error handler (undecodable bytes become U+DC80..U+DCFF
 * so they survive a round trip). Real rootfs images are UTF-8, so the strict
 * decoder handles everything and the fallback is only there for fidelity.
 */
function nts(field: Buffer): string {
  const end = field.indexOf(0);
  const bytes = field.subarray(0, end === -1 ? field.length : end);
  try {
    return STRICT_UTF8.decode(bytes);
  } catch {
    return decodeSurrogateEscape(bytes);
  }
}

function decodeSurrogateEscape(bytes: Uint8Array): string {
  const out: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i]!;
    let len = 0;
    let cp = 0;
    if (b0 < 0x80) { out.push(String.fromCharCode(b0)); i += 1; continue; }
    else if (b0 >= 0xc2 && b0 <= 0xdf) { len = 2; cp = b0 & 0x1f; }
    else if (b0 >= 0xe0 && b0 <= 0xef) { len = 3; cp = b0 & 0x0f; }
    else if (b0 >= 0xf0 && b0 <= 0xf4) { len = 4; cp = b0 & 0x07; }

    let ok = len !== 0 && i + len <= bytes.length;
    for (let k = 1; ok && k < len; k++) {
      const bk = bytes[i + k]!;
      if ((bk & 0xc0) !== 0x80) ok = false;
      else cp = (cp << 6) | (bk & 0x3f);
    }
    if (ok && len === 3) ok = cp >= 0x800 && !(cp >= 0xd800 && cp <= 0xdfff);
    if (ok && len === 4) ok = cp >= 0x10000 && cp <= 0x10ffff;

    if (!ok) { out.push(String.fromCharCode(0xdc00 | b0)); i += 1; continue; }
    out.push(String.fromCodePoint(cp));
    i += len;
  }
  return out.join("");
}

/** CPython tarfile's `calc_chksums`: bytes 148..155 count as eight spaces. */
function checksumMatches(block: Buffer, stored: number): boolean {
  let unsigned = 256;
  let signed = 256;
  for (let i = 0; i < BLOCKSIZE; i++) {
    if (i >= 148 && i < 156) continue;
    const b = block[i]!;
    unsigned += b;
    signed += b > 127 ? b - 256 : b;
  }
  return stored === unsigned || stored === signed;
}

function isAllZero(block: Buffer): boolean {
  for (let i = 0; i < BLOCKSIZE; i++) if (block[i] !== 0) return false;
  return true;
}

/** CPython tarfile's `TarInfo.frombuf`, minus the sparse-header bookkeeping. */
function fromBuf(block: Buffer, offset: number): TarMember {
  const chksum = nti(block.subarray(148, 156));
  if (!checksumMatches(block, chksum)) {
    throw new Error(`bad tar header checksum at offset ${offset}`);
  }

  const member: TarMember = {
    name: nts(block.subarray(0, 100)),
    mode: nti(block.subarray(100, 108)),
    uid: nti(block.subarray(108, 116)),
    gid: nti(block.subarray(116, 124)),
    size: nti(block.subarray(124, 136)),
    mtime: nti(block.subarray(136, 148)),
    mtimeIsFloat: false,
    type: block[156]!,
    linkname: nts(block.subarray(157, 257)),
    dataOffset: offset + BLOCKSIZE,
    headerOffset: offset,
  };
  const prefix = nts(block.subarray(345, 500));

  // Old V7 tar represents a directory as a regular file with a trailing slash.
  if (member.type === AREGTYPE && member.name.endsWith("/")) member.type = DIRTYPE;

  // Remove redundant slashes from directories.
  if (isDir(member)) member.name = member.name.replace(/\/+$/, "");

  // Reconstruct a ustar longname from the prefix field.
  if (prefix && !GNU_TYPES.has(member.type)) member.name = `${prefix}/${member.name}`;

  return member;
}

/** Parse a pax extended header payload into its key/value records. */
function parsePaxRecords(payload: Buffer): Map<string, string> {
  const headers = new Map<string, string>();
  let pos = 0;
  while (pos < payload.length && payload[pos] !== 0) {
    // Each record is "%d %s=%s\n", where the length covers the whole record.
    const space = payload.indexOf(0x20, pos);
    if (space === -1) throw new Error("invalid pax header: no length field");
    const length = Number(payload.toString("latin1", pos, space));
    if (!Number.isInteger(length) || length < 5 || pos + length > payload.length) {
      throw new Error("invalid pax header: bad record length");
    }
    const valueEnd = pos + length - 1; // index of the trailing '\n'
    const record = payload.subarray(space + 1, valueEnd);
    const eq = record.indexOf(0x3d);
    if (eq <= 0 || payload[valueEnd] !== 0x0a) throw new Error("invalid pax header: bad record framing");
    headers.set(nts(record.subarray(0, eq)), nts(record.subarray(eq + 1)));
    pos += length;
  }
  return headers;
}

/**
 * CPython tarfile's `_apply_pax_info`, restricted to the fields that end up in
 * fs.json. Note that pax `mtime` is parsed as a float by CPython, which changes
 * how it is rendered in JSON ("1.7e9" style values come out as `123.0`).
 */
function applyPaxInfo(member: TarMember, headers: Map<string, string>): void {
  for (const [keyword, value] of headers) {
    if (keyword.startsWith("GNU.sparse.")) {
      throw new Error("GNU sparse members are not supported by this port");
    }
    switch (keyword) {
      case "path":
        member.name = value.replace(/\/+$/, "");
        break;
      case "linkpath":
        member.linkname = value;
        break;
      case "size": {
        const n = parseInt(value, 10);
        member.size = Number.isNaN(n) ? 0 : n;
        break;
      }
      case "mtime": {
        const n = Number(value);
        member.mtime = Number.isNaN(n) ? 0 : n;
        member.mtimeIsFloat = true;
        break;
      }
      case "uid":
      case "gid": {
        const n = parseInt(value, 10);
        (member as unknown as Record<string, number>)[keyword] = Number.isNaN(n) ? 0 : n;
        break;
      }
      default:
        break; // uname/gname and unknown keys do not affect fs.json
    }
  }
}

interface ReadResult {
  member: TarMember | null; // null = end of archive
  next: number;
}

/**
 * Read one logical member starting at `offset`, transparently consuming the GNU
 * long-name/long-link and pax extended headers that precede it.
 */
function readMember(buf: Buffer, offset: number, globalPax: Map<string, string>): ReadResult {
  if (offset + BLOCKSIZE > buf.length) return { member: null, next: buf.length };

  const block = buf.subarray(offset, offset + BLOCKSIZE);
  if (isAllZero(block)) return { member: null, next: offset + BLOCKSIZE };

  const member = fromBuf(block, offset);
  const dataOffset = offset + BLOCKSIZE;

  if (member.type === GNUTYPE_LONGNAME || member.type === GNUTYPE_LONGLINK) {
    // The real name/linkname is stored as this record's payload; the header
    // that follows carries every other field.
    const payload = buf.subarray(dataOffset, dataOffset + member.size);
    const text = nts(payload);
    const result = readMember(buf, dataOffset + blockRound(member.size), globalPax);
    if (!result.member) throw new Error("truncated tar: missing header after GNU long name/link");
    if (member.type === GNUTYPE_LONGNAME) {
      result.member.name = text;
      // CPython uses removesuffix() here, stripping exactly one trailing slash
      // (frombuf strips all of them) — replicated so odd archives match.
      if (isDir(result.member)) result.member.name = result.member.name.replace(/\/$/, "");
    } else {
      result.member.linkname = text;
    }
    result.member.headerOffset = offset;
    return result;
  }

  if (member.type === XHDTYPE || member.type === XGLTYPE || member.type === SOLARIS_XHDTYPE) {
    const payload = buf.subarray(dataOffset, dataOffset + member.size);
    const records = parsePaxRecords(payload);
    const result = readMember(buf, dataOffset + blockRound(member.size), globalPax);
    if (member.type === XGLTYPE) {
      for (const [k, v] of records) globalPax.set(k, v);
      return result;
    }
    if (!result.member) throw new Error("truncated tar: missing header after pax extended header");
    applyPaxInfo(result.member, records);
    result.member.headerOffset = offset;
    return result;
  }

  if (member.type === GNUTYPE_SPARSE) {
    throw new Error(`GNU sparse members are not supported by this port: ${member.name}`);
  }

  // Global pax headers apply to every following member.
  if (globalPax.size > 0) applyPaxInfo(member, globalPax);
  if (isDir(member)) member.name = member.name.replace(/\/+$/, "");

  // Only regular (and unknown) types occupy data blocks; a hardlink, symlink,
  // directory or device node is header-only even if its size field is nonzero.
  let next = dataOffset;
  if (isReg(member) || !SUPPORTED_TYPES.has(member.type)) next += blockRound(member.size);
  return { member, next };
}

function readTar(path: string): TarArchive {
  const buf = readFileSync(path);
  const members: TarMember[] = [];
  const globalPax = new Map<string, string>();
  let offset = 0;
  while (offset + BLOCKSIZE <= buf.length) {
    const { member, next } = readMember(buf, offset, globalPax);
    if (!member) break;
    members.push(member);
    if (next <= offset) throw new Error(`tar reader made no progress at offset ${offset}`);
    offset = next;
  }
  return { buf, members };
}

/** Lexical `os.path.normpath` for POSIX paths, used to match hardlink targets. */
function normpath(path: string): string {
  if (path === "") return ".";
  let initialSlashes = path.startsWith("/") ? 1 : 0;
  if (initialSlashes && path.startsWith("//") && !path.startsWith("///")) initialSlashes = 2;
  const comps: string[] = [];
  for (const comp of path.split("/")) {
    if (comp === "" || comp === ".") continue;
    if (comp !== ".." || (!initialSlashes && comps.length === 0) || comps[comps.length - 1] === "..") {
      comps.push(comp);
    } else if (comps.length) {
      comps.pop();
    }
  }
  return "/".repeat(initialSlashes) + comps.join("/") || ".";
}

/**
 * CPython's `TarFile.extractfile` follows hard and symbolic links to the member
 * that actually holds the bytes. Hardlink targets are searched backwards from
 * the link, since a hardlink always references an already-archived file.
 */
function resolveLinkTarget(tar: TarArchive, member: TarMember, depth = 0): TarMember {
  if (depth > 32) throw new Error(`too many levels of links at ${member.name}`);
  if (!isHardLink(member) && !isSymLink(member)) return member;

  let linkname: string;
  let limit: number;
  if (isSymLink(member)) {
    const dir = member.name.includes("/") ? member.name.slice(0, member.name.lastIndexOf("/")) : "";
    linkname = [dir, member.linkname].filter((p) => p !== "").join("/");
    limit = tar.members.length;
  } else {
    linkname = member.linkname;
    limit = tar.members.findIndex((m) => m === member);
    if (limit < 0) limit = tar.members.length;
  }

  const wanted = normpath(linkname);
  for (let i = limit - 1; i >= 0; i--) {
    const candidate = tar.members[i]!;
    if (normpath(candidate.name) === wanted) return resolveLinkTarget(tar, candidate, depth + 1);
  }
  throw new Error(`linkname ${JSON.stringify(linkname)} not found (referenced by ${member.name})`);
}

function memberData(tar: TarArchive, member: TarMember): Buffer {
  return tar.buf.subarray(member.dataOffset, member.dataOffset + member.size);
}

function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

// ---------------------------------------------------------------------------
// Python-compatible JSON encoding
// ---------------------------------------------------------------------------

const JSON_ESCAPES: Record<number, string> = {
  0x08: "\\b", 0x09: "\\t", 0x0a: "\\n", 0x0c: "\\f", 0x0d: "\\r",
  0x22: '\\"', 0x5c: "\\\\",
};

/**
 * Python's `json` defaults to `ensure_ascii=True`, which escapes every code
 * unit outside printable ASCII as \uXXXX (lowercase hex) — JSON.stringify does
 * not, so a single non-ASCII filename would break byte-exactness. Iterating
 * UTF-16 code units also reproduces Python's surrogate-pair output for
 * astral characters and its \udcXX output for surrogateescape bytes.
 */
function pyJsonString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0x20 && c <= 0x7e) {
      out += c === 0x22 || c === 0x5c ? JSON_ESCAPES[c]! : s[i]!;
    } else {
      out += JSON_ESCAPES[c] ?? `\\u${c.toString(16).padStart(4, "0")}`;
    }
  }
  return `${out}"`;
}

/**
 * Python renders ints bare and floats via repr(), so an integral float still
 * carries a ".0". (Only reachable for pax mtimes; the exponent form Python uses
 * above 1e16 is out of range for a timestamp.)
 */
function pyJsonNumber(n: number, isFloat: boolean): string {
  if (!Number.isFinite(n)) throw new Error(`cannot serialise non-finite number: ${n}`);
  if (!isFloat) return String(n);
  const s = String(n);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

// ---------------------------------------------------------------------------
// fs.json construction
// ---------------------------------------------------------------------------

type NodeTarget = string | FsNode[];

/** In-memory form of one v86 inode; serialised as the positional array above. */
interface FsNode {
  name: string;
  size: number;
  mtime: number;
  mtimeIsFloat: boolean;
  mode: number;
  uid: number;
  gid: number;
  /** null means the 7th slot is omitted (Python pops trailing `None`s). */
  target: NodeTarget | null;
}

function handleTar(tar: TarArchive): { root: FsNode[]; totalSize: number } {
  const mainroot: FsNode[] = [];
  const filenameToHash = new Map<string, string>();
  let totalSize = 0;

  for (const member of tar.members) {
    const parts = member.name.split("/");
    const name = parts.pop()!;

    // Walk to the parent directory. This mirrors the Python loop exactly,
    // including its quirks: the scan is not short-circuited (the last matching
    // child wins) and a missing component leaves `dir` where it was.
    let dir: FsNode[] = mainroot;
    for (const part of parts) {
      const searchIn = dir; // Python evaluates `dir` once to build the iterator
      for (const child of searchIn) {
        if (child.name === part) {
          if (!Array.isArray(child.target)) {
            throw new Error(`path component ${JSON.stringify(part)} of ${member.name} is not a directory`);
          }
          dir = child.target;
        }
      }
    }

    const node: FsNode = {
      name,
      size: member.size,
      mtime: member.mtime,
      mtimeIsFloat: member.mtimeIsFloat,
      mode: member.mode,
      uid: member.uid,
      gid: member.gid,
      target: null,
    };

    if (isReg(member) || isHardLink(member)) {
      // Hardlinks are stored as full copies: the link resolves to the member
      // that holds the bytes, and both inodes point at the same content blob.
      node.mode |= S_IFREG;
      const source = resolveLinkTarget(tar, member);
      const fileHash = sha256Hex(memberData(tar, source));
      const filename = fileHash.slice(0, HASH_LENGTH) + ".bin";
      const existing = filenameToHash.get(filename);
      if (existing !== undefined && existing !== fileHash) {
        throw new Error(`Collision in short hash (${existing} and ${fileHash})`);
      }
      filenameToHash.set(filename, fileHash);
      node.target = filename;
      // The tar header records size 0 for a hardlink; use the target's size.
      if (isHardLink(member)) node.size = source.size;
    } else if (isDir(member)) {
      node.mode |= S_IFDIR;
      node.target = [];
    } else if (isSymLink(member)) {
      node.mode |= S_IFLNK;
      node.target = member.linkname;
    } else {
      // Fifos, sockets and device nodes: no type bits, no 7th slot.
      console.error(`Unsupported type: ${formatTypeflag(member.type)} (${name})`);
    }

    totalSize += node.size;
    dir.push(node);
  }

  return { root: mainroot, totalSize };
}

/** Render a typeflag the way Python formats the `bytes` object it stores. */
function formatTypeflag(type: number): string {
  const ch = String.fromCharCode(type);
  return type >= 0x20 && type <= 0x7e ? `b'${ch}'` : `b'\\x${type.toString(16).padStart(2, "0")}'`;
}

function encodeNodes(nodes: FsNode[], out: string[]): void {
  out.push("[");
  for (let i = 0; i < nodes.length; i++) {
    if (i > 0) out.push(",");
    const node = nodes[i]!;
    out.push(
      "[", pyJsonString(node.name),
      ",", String(node.size),
      ",", pyJsonNumber(node.mtime, node.mtimeIsFloat),
      ",", String(node.mode),
      ",", String(node.uid),
      ",", String(node.gid),
    );
    if (node.target !== null) {
      out.push(",");
      if (typeof node.target === "string") out.push(pyJsonString(node.target));
      else encodeNodes(node.target, out);
    }
    out.push("]");
  }
  out.push("]");
}

function encodeFsJson(root: FsNode[], totalSize: number): string {
  // Key order matches the Python dict literal; separators are (',', ':').
  const out: string[] = ['{"fsroot":'];
  encodeNodes(root, out);
  out.push(`,"version":${VERSION},"size":${totalSize}}`);
  return out.join("");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface Options {
  out: string | null;
  path: string;
}

function parseArgs(argv: string[]): Options {
  let out: string | null = null;
  let path: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--out") {
      out = argv[++i] ?? null;
      if (out === null) throw new Error("--out requires a file path");
    } else if (arg.startsWith("--out=")) {
      out = arg.slice("--out=".length);
    } else if (arg === "--zstd" || arg === "--exclude" || arg.startsWith("--exclude=")) {
      throw new Error(`${arg.split("=")[0]} is not supported by this port (see the header comment)`);
    } else if (arg === "-h" || arg === "--help") {
      console.log("usage: fs2json.ts [--out fs.json] <rootfs.tar>");
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new Error(`unknown option: ${arg}`);
    } else if (path === null) {
      path = arg;
    } else {
      throw new Error(`unexpected extra argument: ${arg}`);
    }
  }

  if (path === null) throw new Error("usage: fs2json.ts [--out fs.json] <rootfs.tar>");
  return { out, path };
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const path = normpath(options.path);

  const stats = statSync(path);
  if (!stats.isFile()) {
    throw new Error(`${path} is not a tar file: this port does not support reading a directory`);
  }

  const tar = readTar(path);
  const { root, totalSize } = handleTar(tar);

  console.error("Creating json ...");
  const json = encodeFsJson(root, totalSize);
  if (options.out === null) process.stdout.write(json);
  else writeFileSync(options.out, json, "ascii"); // ensure_ascii output is pure ASCII
}

if (import.meta.main) {
  try {
    main();
  } catch (err) {
    console.error(`fs2json: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
