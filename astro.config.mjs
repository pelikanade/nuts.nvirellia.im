// @ts-check
import path from "node:path";
import starlight from "@astrojs/starlight";
import starlightUtils from "@lorenzo_lewis/starlight-utils";
import { defineConfig } from "astro/config";
import llmTranslator from "astro-llm-translator";
import starlightTranslator from "astro-llm-translator/starlight";
import starlightGiscus from "starlight-giscus";
import { createStarlightObsidianPlugin } from "starlight-obsidian";
import starlightUiTweaks from "starlight-ui-tweaks";
import { stageVault, vaultIgnore } from "./src/lib/vault.mjs";

// Linked Obsidian vault. Do not commit it.
//   ln -s "/path/to/nvirellia's nuts" vault
//   VAULT_PATH=/absolute/path bun run build
const vault = process.env.VAULT_PATH || "./vault";

// Only these vault folders and notes are published. Anything else stays private.
// NutPages/ holds dedicated site pages (e.g. 关于我.md with `slug: aboutme`).
const published = {
  notes: ["Design", "Digests", "Attachments", "NutPages"],
  posts: ["Posts", "Attachments"],
};

// Published, but omitted from the sidebar. Globs are vault-relative and scoped
// to one starlight-obsidian instance (`*`, `**`, `?`). A single note can do the
// same with frontmatter `sidebar: { hidden: true }`. Empty folders drop out.
const sidebarHidden = {
  notes: ["Digests/_deep/**"],
};

// starlight-obsidian reads a filtered copy of the vault: private notes never
// reach it, and title wikilinks are rewritten to the target's real URL (honouring
// `slug`), including links between the notes and posts instances. Links to
// unpublished notes become plain text. `sidebarHidden` matches are still in the
// copy, with `sidebar.hidden` set so they stay linkable and searchable. See
// src/lib/vault.mjs.
const stagedVault = stageVault({
  vault,
  stageDir: path.resolve("node_modules/.cache/nuts-vault"),
  published,
  sidebarHidden,
}).stageDir;

const [starlightObsidianNotes, notesSidebarGroup] =
  createStarlightObsidianPlugin();
const [starlightObsidianPosts, postsSidebarGroup] =
  createStarlightObsidianPlugin();

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
        // Notes: Design, Digests, NutPages. Attachments are copied for embeds.
        starlightObsidianNotes({
          vault: stagedVault,
          output: "notes",
          sidebar: {
            label: {
              "zh-CN": "知识库",
              en: "Notes",
            },
            collapsedFolders: true,
          },
          copyFrontmatter: "starlight",
          ignore: vaultIgnore(stagedVault, published.notes),
        }),
        // Posts: vault Posts/ only. Attachments are copied again under this output dir.
        starlightObsidianPosts({
          vault: stagedVault,
          output: "posts",
          sidebar: {
            label: {
              "zh-CN": "文章",
              en: "Posts",
            },
            collapsedFolders: true,
          },
          copyFrontmatter: "starlight",
          ignore: vaultIgnore(stagedVault, published.posts),
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
