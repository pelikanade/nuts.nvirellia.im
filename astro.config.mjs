// @ts-check
import fs from "node:fs";
import path from "node:path";
import starlight from "@astrojs/starlight";
import starlightUtils from "@lorenzo_lewis/starlight-utils";
import { defineConfig } from "astro/config";
import llmTranslator from "astro-llm-translator";
import starlightTranslator from "astro-llm-translator/starlight";
import starlightGiscus from "starlight-giscus";
import { createStarlightObsidianPlugin } from "starlight-obsidian";
import starlightUiTweaks from "starlight-ui-tweaks";

// Linked Obsidian vault. Do not commit it.
//   ln -s "/path/to/nvirellia's nuts" vault
//   VAULT_PATH=/absolute/path bun run build
const vault = process.env.VAULT_PATH || "./vault";

// Only these vault folders and notes are published. Anything else stays private.
const published = {
  notes: ["Design", "Digests", "Attachments", "关于我.md"],
  posts: ["Posts", "Attachments"],
};

const [starlightObsidianNotes, notesSidebarGroup] =
  createStarlightObsidianPlugin();
const [starlightObsidianPosts, postsSidebarGroup] =
  createStarlightObsidianPlugin();

// fast-glob patterns are relative to the vault root. A bare filename matches
// only that root file (`*` does not cross `/`); `Name/**` matches the tree.
// Metacharacters are escaped so a private note named e.g. `!draft.md` is ignored.
function vaultIgnore(allowlist) {
  if (!fs.existsSync(vault)) {
    throw new Error(
      `Obsidian vault not found at "${path.resolve(vault)}". Refusing to publish without an allowlist scan.`,
    );
  }

  let entries;
  try {
    entries = fs.readdirSync(vault, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `Cannot read Obsidian vault at "${path.resolve(vault)}". Refusing to publish without an allowlist scan.`,
      { cause: error },
    );
  }

  const allowed = new Set(allowlist);

  return entries.flatMap((entry) => {
    if (entry.name.startsWith(".") || allowed.has(entry.name)) return [];
    const literal = entry.name.replace(/[\\*?[\]{}()!]/g, "\\$&");
    return [entry.isDirectory() ? `${literal}/**` : literal];
  });
}

// TODO(giscus): pelikanade/nuts.nvirellia.im has no discussion category yet.
// Enable Discussions, create a category, then set all three from https://giscus.app
// (do not invent IDs):
//   GISCUS_REPO_ID, GISCUS_CATEGORY, GISCUS_CATEGORY_ID
const giscusRepoId = process.env.GISCUS_REPO_ID;
const giscusCategory = process.env.GISCUS_CATEGORY;
const giscusCategoryId = process.env.GISCUS_CATEGORY_ID;

export default defineConfig({
  site: "https://nuts.nvirellia.im",
  integrations: [
    starlight({
      title: "nuts.nvirellia.im",
      defaultLocale: "root",
      locales: {
        root: {
          label: "简体中文",
          lang: "zh-CN",
        },
        en: {
          label: "English",
        },
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/pelikanade/nuts.nvirellia.im",
        },
        {
          icon: "telegram",
          label: "Telegram",
          href: "https://t.me/noa_virellia",
        },
      ],
      plugins: [
        // Notes: Design, Digests, root 关于我.md. Attachments are copied for embeds.
        starlightObsidianNotes({
          vault,
          output: "notes",
          sidebar: {
            label: {
              "zh-CN": "知识库",
              en: "Notes",
            },
            collapsedFolders: true,
          },
          copyFrontmatter: "starlight",
          ignore: vaultIgnore(published.notes),
        }),
        // Posts: vault Posts/ only. Attachments are copied again under this output dir.
        starlightObsidianPosts({
          vault,
          output: "posts",
          sidebar: {
            label: {
              "zh-CN": "文章",
              en: "Posts",
            },
            collapsedFolders: true,
          },
          copyFrontmatter: "starlight",
          ignore: vaultIgnore(published.posts),
        }),
        starlightUiTweaks({
          navbarLinks: [
            {
              label: "关于我",
              href: "/aboutme",
            },
            {
              label: "朋友们",
              href: "/friends",
            },
          ],
          locales: {
            en: {
              navbarLinks: [
                {
                  label: "About Me",
                  href: "/en/aboutme",
                },
                {
                  label: "Friends",
                  href: "/en/friends",
                },
              ],
            },
          },
        }),
        ...(giscusRepoId && giscusCategory && giscusCategoryId
          ? [
              starlightGiscus({
                repo: "pelikanade/nuts.nvirellia.im",
                repoId: giscusRepoId,
                category: giscusCategory,
                categoryId: giscusCategoryId,
              }),
            ]
          : []),
        starlightUtils({
          multiSidebar: {
            switcherStyle: "horizontalList",
          },
        }),
        starlightTranslator(),
      ],
      sidebar: [notesSidebarGroup, postsSidebarGroup],
      customCss: ["./src/custom.css", "./src/fonts/font-face.css"],
      pagination: false,
    }),
    llmTranslator({
      sourceLang: "root",
      customInstructions: `
        You are translating content for nuts.nvirellia.im.

        nuts.nvirellia.im is a quiet, personal digital garden:
        a place for systems, memories, and gentle existence.

        Tone & Style
        Calm, soft, and restrained
        Clear and readable, never flashy
        Slightly poetic when appropriate, but never ornamental
        Prefer warmth over cleverness
        Avoid marketing language, hype, or dramatic exaggeration

        Voice
        Introspective, steady, and sincere
        Respects boundaries and emotional distance
        Treats both people and systems with care

        Technical Content
        Preserve accuracy and structure
        Keep explanations clean and precise
        Do not oversimplify; trust the reader’s intelligence
        When unsure, prefer clarity over flourish

        Language Refinement
        Avoid academic or textbook-style transitions (e.g. “Firstly”, “Secondly”, “Two questions arise here”)
        Prefer natural reasoning flow over formal exposition
        Break long explanatory sentences into shorter, calmer ones when possible
        Write as if explaining to a peer during a quiet debugging session, not presenting a report
        If the original phrasing feels structurally correct but emotionally stiff, soften it slightly while preserving technical accuracy.
      `,
      targetLangs: ["en"],
      contentDir: "src/content/docs",
      banner: {
        en: "This content is translated by an LLM and may contain inaccuracies.",
      },
    }),
  ],
});
