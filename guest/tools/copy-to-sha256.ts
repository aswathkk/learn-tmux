#!/usr/bin/env bun
/**
 * copy-to-sha256.ts — TypeScript/Bun port of v86's tools/copy-to-sha256.py
 * (github.com/copy/v86).
 *
 * Reads the same tar that fs2json.ts reads and writes every regular file's
 * contents to <outdir>/<sha256hex[:10]>.bin, which is the layout libv86's 9p
 * filesystem fetches blobs from. Identical files collapse onto one blob.
 *
 * Usage:
 *   bun run guest/tools/copy-to-sha256.ts <rootfs.tar> <outdir>
 *
 * Deliberately NOT ported from the Python original:
 *   - The directory-input mode (`handle_dir`): the build always feeds a tar, so
 *     this port accepts a tar file only and errors out on a directory.
 *   - `--zstd` / the `.bin.zst` naming and the whole ZstdCompress class: the
 *     build ships uncompressed `.bin` blobs, so compression is rejected rather
 *     than silently ignored.
 *   - GNU sparse-file members ('S' + GNU.sparse.* pax records): `docker export`
 *     never emits them; they are rejected loudly instead of parsed wrong.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";

/**
 * Length of the sha256 hex prefix used to name content blobs.
 *
 * MUST stay in sync with HASH_LENGTH in fs2json.ts (and with the Python
 * originals): fs2json writes these blob names into fs.json and this script
 * writes the blobs themselves, so if the two ever disagree every file in the
 * guest becomes a dangling reference.
 *
 * 10 hex chars = 40 bits, short enough to keep fs.json small while leaving a
 * birthday bound around 2^20 distinct files before a collision is likely; a
 * rootfs has ~10^3-10^4. (fs2json raises on a real collision; this script does
 * not need to, because it detects an existing blob by filename and skips it.)
 */
const HASH_LENGTH = 10;

// ---------------------------------------------------------------------------
// Minimal tar reader: POSIX ustar + GNU long name/link + pax extended headers.
//
// Written inline rather than pulled from npm so the build needs nothing but
// Bun. It mirrors CPython's tarfile module closely, because "byte-exact with
// the Python tool" really means "agrees with tarfile on every field".
// Keep in sync with the copy of this reader in fs2json.ts.
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

/** CPython tarfile's `_apply_pax_info`, restricted to the fields we consume. */
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
        break;
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
// Blob extraction
// ---------------------------------------------------------------------------

function handleTar(tar: TarArchive, toPath: string): void {
  for (const member of tar.members) {
    // Only regular files and hardlinks carry content. Directories, symlinks,
    // fifos and device nodes exist purely as inodes in fs.json.
    if (!isReg(member) && !isHardLink(member)) continue;

    // A hardlink resolves to the earlier member holding the bytes, so both
    // inodes end up naming the same blob.
    const source = resolveLinkTarget(tar, member);
    const data = memberData(tar, source);
    const filename = sha256Hex(data).slice(0, HASH_LENGTH) + ".bin";
    const toAbs = `${toPath}/${filename}`;

    // Content-addressed names mean duplicate files (and every hardlink) land on
    // a blob that is already there; the filesystem check is the deduplication.
    if (existsSync(toAbs)) {
      console.error(`Exists, skipped ${toAbs} (${member.name})`);
    } else {
      console.error(`Extracted ${toAbs} (${member.name})`);
      writeFileSync(toAbs, data);
    }
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface Options {
  fromPath: string;
  toPath: string;
}

function parseArgs(argv: string[]): Options {
  const positional: string[] = [];
  for (const arg of argv) {
    if (arg === "--zstd") {
      throw new Error("--zstd is not supported by this port (see the header comment)");
    }
    if (arg === "-h" || arg === "--help") {
      console.log("usage: copy-to-sha256.ts <rootfs.tar> <outdir>");
      process.exit(0);
    }
    if (arg.startsWith("-")) throw new Error(`unknown option: ${arg}`);
    positional.push(arg);
  }
  if (positional.length !== 2) throw new Error("usage: copy-to-sha256.ts <rootfs.tar> <outdir>");
  return { fromPath: positional[0]!, toPath: positional[1]! };
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const fromPath = normpath(options.fromPath);
  const toPath = normpath(options.toPath);

  const fromStats = statSync(fromPath);
  if (!fromStats.isFile()) {
    throw new Error(`${fromPath} is not a tar file: this port does not support reading a directory`);
  }
  if (!existsSync(toPath) || !statSync(toPath).isDirectory()) {
    throw new Error(`output directory ${toPath} does not exist`);
  }

  handleTar(readTar(fromPath), toPath);
}

if (import.meta.main) {
  try {
    main();
  } catch (err) {
    console.error(`copy-to-sha256: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
