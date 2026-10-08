// @ts-check
// Builds a filtered copy of the Obsidian vault that only contains published
// folders/notes, and rewrites title wikilinks (`[[Note]]`, `[[Note|text]]`)
// to the target's real site URL across all starlight-obsidian instances.
//
// - starlight-obsidian never sees private notes: they are not in the copy.
// - `slug` (or `permalink`) frontmatter wins, like Starlight routing does.
// - Wikilinks to notes that are not published become plain text (the alias,
//   or the target's last path segment), so no private path or URL leaks.
// - Embeds (`![[...]]`) and same-page anchors (`[[#Heading]]`) are left to
//   starlight-obsidian.
import fs from "node:fs";
import path from "node:path";
import { slug as githubSlug } from "github-slugger";
import yaml from "yaml";

const ASSET_EXTENSIONS = new Set([
  ".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp",
  ".flac", ".m4a", ".mp3", ".wav", ".ogg", ".3gp",
  ".mkv", ".mov", ".mp4", ".ogv", ".webm", ".pdf",
]);

const WIKILINK = /(!?)\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g;

/**
 * Root entries of the vault that are not in the allowlist, as fast-glob
 * ignore patterns. A bare filename matches only that root file (`*` does not
 * cross `/`); `Name/**` matches the tree. Metacharacters are escaped.
 * @param {string} dir
 * @param {string[]} allowlist
 */
export function vaultIgnore(dir, allowlist) {
  const allowed = new Set(allowlist);
  return readVaultRoot(dir).flatMap((entry) => {
    if (entry.name.startsWith(".") || allowed.has(entry.name)) return [];
    const literal = entry.name.replace(/[\\*?[\]{}()!]/g, "\\$&");
    return [entry.isDirectory() ? `${literal}/**` : literal];
  });
}

/** @param {string} dir */
function readVaultRoot(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(
      `Obsidian vault not found at "${path.resolve(dir)}". Refusing to publish without an allowlist scan.`,
    );
  }
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `Cannot read Obsidian vault at "${path.resolve(dir)}". Refusing to publish without an allowlist scan.`,
      { cause: error },
    );
  }
}

/**
 * Copy the published part of `vault` into `stageDir` and rewrite wikilinks.
 * @param {object} options
 * @param {string} options.vault Source vault (never written to).
 * @param {string} options.stageDir Output directory (wiped first).
 * @param {Record<string, string[]>} options.published starlight-obsidian
 *   output name -> allowlisted vault root entries.
 * @param {string} [options.configFolder]
 */
export function stageVault({ vault, stageDir, published, configFolder = ".obsidian" }) {
  const root = path.resolve(vault);
  const entries = readVaultRoot(root);
  const allowed = new Set(Object.values(published).flat());

  const appJson = path.join(root, configFolder, "app.json");
  if (!fs.existsSync(appJson)) {
    throw new Error(`"${root}" is not an Obsidian vault (missing ${configFolder}/app.json).`);
  }

  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(stageDir, configFolder), { recursive: true });
  fs.copyFileSync(appJson, path.join(stageDir, configFolder, "app.json"));

  /** @type {string[]} vault-relative POSIX paths of every staged file */
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || !allowed.has(entry.name)) continue;
    collect(root, entry.name, entry, files);
  }

  // Which instance publishes a note decides its default URL prefix.
  /** @param {string} rel */
  const outputFor = (rel) => {
    const top = rel.split("/")[0];
    for (const [output, list] of Object.entries(published)) {
      if (top !== undefined && list.includes(top)) return output;
    }
    return undefined;
  };

  /** @type {Note[]} */
  const notes = [];
  /** @type {Map<string, string>} */
  const sources = new Map();
  for (const rel of files) {
    if (!rel.endsWith(".md")) continue;
    const source = fs.readFileSync(path.join(root, rel), "utf8");
    sources.set(rel, source);
    const output = outputFor(rel);
    const fm = readFrontmatter(source);
    const isPublished = output !== undefined && fm.publish !== false && fm.publish !== "false" && fm.draft !== true;
    notes.push({
      rel,
      noExt: rel.slice(0, -3),
      stem: path.posix.basename(rel, ".md"),
      url: isPublished ? noteUrl(rel, output, fm) : undefined,
    });
  }
  const assetNames = new Set(files.filter((f) => !f.endsWith(".md")).map((f) => path.posix.basename(f).toLowerCase()));

  for (const rel of files) {
    const dest = path.join(stageDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const source = sources.get(rel);
    if (source === undefined) {
      fs.copyFileSync(path.join(root, rel), dest);
    } else {
      fs.writeFileSync(dest, rewriteWikilinks(source, rel, notes, assetNames));
    }
  }

  return { stageDir, notes };
}

/**
 * @typedef {{ rel: string, noExt: string, stem: string, url: string | undefined }} Note
 */

/**
 * @param {string} root
 * @param {string} rel
 * @param {fs.Dirent} dirent
 * @param {string[]} out
 */
function collect(root, rel, dirent, out) {
  const abs = path.join(root, rel);
  const isDir = dirent.isDirectory() || (dirent.isSymbolicLink() && fs.statSync(abs).isDirectory());
  if (!isDir) {
    out.push(rel);
    return;
  }
  for (const child of fs.readdirSync(abs, { withFileTypes: true })) {
    if (child.name.startsWith(".")) continue;
    collect(root, `${rel}/${child.name}`, child, out);
  }
}

/** @param {string} source */
function readFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(source);
  if (!match) return {};
  try {
    const data = yaml.parse(match[1] ?? "");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

/**
 * Same id rules as Starlight's docs loader (Astro glob loader): `slug`
 * frontmatter, otherwise github-slugger per path segment, `/index` dropped.
 * starlight-obsidian maps `permalink` to `slug`.
 * @param {string} rel
 * @param {string} output
 * @param {Record<string, unknown>} fm
 */
function noteUrl(rel, output, fm) {
  const custom = typeof fm.slug === "string" ? fm.slug : typeof fm.permalink === "string" ? fm.permalink : undefined;
  let id;
  if (custom !== undefined) {
    id = custom.replace(/^\/+|\/+$/g, "");
  } else {
    id = `${output}/${rel.slice(0, -3)}`
      .split("/")
      .map((segment) => githubSlug(segment))
      .join("/")
      .replace(/\/index$/, "");
  }
  return id === "" || id === "index" ? "/" : `/${id}/`;
}

/** Obsidian anchor -> starlight-obsidian heading id. @param {string} anchor */
function anchorId(anchor) {
  const value = anchor.startsWith("^") ? anchor.replace("^", "block-") : anchor;
  return `#${githubSlug(value)}`;
}

/**
 * @param {string} target link target without anchor/extension
 * @param {string} fromRel
 * @param {Note[]} notes
 */
function resolveNote(target, fromRel, notes) {
  const wanted = target.replace(/^\/+/, "").toLowerCase();
  if (wanted === "") return undefined;
  const hasPath = wanted.includes("/");
  const candidates = notes.filter((note) => {
    const noExt = note.noExt.toLowerCase();
    if (noExt === wanted) return true;
    if (hasPath) return noExt.endsWith(`/${wanted}`);
    return note.stem.toLowerCase() === wanted;
  });
  if (candidates.length <= 1) return candidates[0];
  const fromDir = path.posix.dirname(fromRel);
  return candidates.sort((a, b) => {
    const sameA = path.posix.dirname(a.rel) === fromDir ? 0 : 1;
    const sameB = path.posix.dirname(b.rel) === fromDir ? 0 : 1;
    return sameA - sameB || a.rel.length - b.rel.length || a.rel.localeCompare(b.rel);
  })[0];
}

/**
 * Rewrite non-embed wikilinks outside frontmatter and code.
 * @param {string} source
 * @param {string} fromRel
 * @param {Note[]} notes
 * @param {Set<string>} assetNames lowercased basenames of staged non-md files
 */
export function rewriteWikilinks(source, fromRel, notes, assetNames) {
  return mapOutsideCode(source, (text) =>
    text.replace(WIKILINK, (match, bang, rawTarget, alias) => {
      if (bang) return match;
      let target = String(rawTarget).trim();
      if (target.endsWith("\\")) target = target.slice(0, -1); // `[[a\|b]]` in tables
      if (target.startsWith("#")) return match;
      const hash = target.indexOf("#");
      const pathPart = (hash === -1 ? target : target.slice(0, hash)).trim();
      const anchor = hash === -1 ? "" : target.slice(hash + 1).trim();
      const label = alias?.trim() || path.posix.basename(pathPart.replace(/\.md$/i, ""));

      const ext = path.posix.extname(pathPart).toLowerCase();
      if (ASSET_EXTENSIONS.has(ext)) {
        // Attachments are handled by starlight-obsidian when they are staged.
        return assetNames.has(path.posix.basename(pathPart).toLowerCase()) ? match : label;
      }

      const note = resolveNote(pathPart.replace(/\.md$/i, ""), fromRel, notes);
      if (!note?.url) return label; // private, unpublished or missing: plain text
      return `[${label}](<${note.url}${anchor ? anchorId(anchor) : ""}>)`;
    }),
  );
}

/**
 * Apply `fn` to every part of a Markdown document that is not frontmatter,
 * a fenced code block or an inline code span.
 * @param {string} source
 * @param {(text: string) => string} fn
 */
function mapOutsideCode(source, fn) {
  let out = "";
  let rest = source;
  const fm = /^---\r?\n[\s\S]*?\r?\n---[^\S\r\n]*(?:\r?\n|$)/.exec(rest);
  if (fm) {
    out += fm[0];
    rest = rest.slice(fm[0].length);
  }

  const lines = rest.split(/(?<=\n)/);
  /** @type {{ char: string, len: number } | undefined} */
  let fence;
  let buffer = "";
  const flush = () => {
    out += mapOutsideInlineCode(buffer, fn);
    buffer = "";
  };
  for (const line of lines) {
    const bare = line.replace(/^(?:[ \t]*>)*[ \t]{0,3}/, "");
    const marker = /^(`{3,}|~{3,})/.exec(bare)?.[1];
    if (fence) {
      out += line;
      if (marker && marker[0] === fence.char && marker.length >= fence.len && /^[`~]+\s*$/.test(bare)) {
        fence = undefined;
      }
    } else if (marker && !(marker[0] === "`" && bare.slice(marker.length).includes("`"))) {
      flush();
      fence = { char: marker[0] ?? "`", len: marker.length };
      out += line;
    } else {
      buffer += line;
    }
  }
  flush();
  return out;
}

/**
 * @param {string} text
 * @param {(text: string) => string} fn
 */
function mapOutsideInlineCode(text, fn) {
  let out = "";
  let plain = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "`") {
      plain += text[i];
      i++;
      continue;
    }
    let run = 0;
    while (text[i + run] === "`") run++;
    // Find a closing run of exactly the same length.
    let j = i + run;
    let close = -1;
    while (j < text.length) {
      if (text[j] === "`") {
        let len = 0;
        while (text[j + len] === "`") len++;
        if (len === run) {
          close = j;
          break;
        }
        j += len;
      } else {
        j++;
      }
    }
    if (close === -1) {
      plain += text.slice(i, i + run);
      i += run;
      continue;
    }
    out += fn(plain) + text.slice(i, close + run);
    plain = "";
    i = close + run;
  }
  return out + fn(plain);
}
