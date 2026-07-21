import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Ocdex Lite",
  description: "Local-first iPhone and iPad PWA remote for Codex running on your Mac.",
  base: "/ocdex-lite/",
  cleanUrls: true,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/ocdex-lite/favicon.svg" }],
    ["link", { rel: "manifest", href: "/ocdex-lite/site.webmanifest" }],
    ["meta", { name: "theme-color", content: "#f7f7f4" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "Ocdex Lite" }],
    ["meta", { property: "og:description", content: "Use your iPhone or iPad as a lightweight remote for Codex running on your Mac." }],
    ["meta", { property: "og:image", content: "https://pastorstephan-prog.github.io/ocdex-lite/social-card.svg" }],
  ],
  locales: {
    root: {
      label: "English",
      lang: "en-US",
      themeConfig: {
        nav: [
          { text: "Start", link: "/guide/phone-bridge" },
          { text: "Goal", link: "/goal" },
          { text: "Safety", link: "/guide/security" },
          { text: "Sponsor", link: "https://github.com/sponsors/pastorstephan-prog" },
          { text: "GitHub", link: "https://github.com/pastorstephan-prog/ocdex-lite" },
        ],
        sidebar: [
          {
            text: "Guide",
            items: [
              { text: "Ocdex Lite Start", link: "/guide/phone-bridge" },
              { text: "Commercial Goal", link: "/goal" },
              { text: "Protocol Notes", link: "/guide/protocol" },
              { text: "Security", link: "/guide/security" },
              { text: "v0.2.1 Release", link: "/guide/releases/v0.2.1" },
              { text: "v0.2.1 Walkthrough", link: "/guide/articles/v0.2.1-visual-docs-and-safety" },
              { text: "v0.2.0 Release", link: "/guide/releases/v0.2.0" },
              { text: "v0.2.0 Walkthrough", link: "/guide/articles/v0.2.0-phone-bridge" },
            ],
          },
        ],
      },
    },
    ja: {
      label: "日本語",
      lang: "ja-JP",
      link: "/ja/",
      themeConfig: {
        nav: [
          { text: "始める", link: "/ja/guide/phone-bridge" },
          { text: "Goal", link: "/ja/goal" },
          { text: "安全設計", link: "/ja/guide/security" },
          { text: "支援", link: "https://github.com/sponsors/pastorstephan-prog" },
          { text: "GitHub", link: "https://github.com/pastorstephan-prog/ocdex-lite" },
        ],
        sidebar: [
          {
            text: "ガイド",
            items: [
              { text: "Ocdex Lite Start", link: "/ja/guide/phone-bridge" },
              { text: "Commercial Goal", link: "/ja/goal" },
              { text: "Protocol Notes", link: "/ja/guide/protocol" },
              { text: "Security", link: "/ja/guide/security" },
              { text: "v0.2.1 Release", link: "/ja/guide/releases/v0.2.1" },
              { text: "v0.2.1 Walkthrough", link: "/ja/guide/articles/v0.2.1-visual-docs-and-safety" },
              { text: "v0.2.0 Release", link: "/ja/guide/releases/v0.2.0" },
              { text: "v0.2.0 Walkthrough", link: "/ja/guide/articles/v0.2.0-phone-bridge" },
            ],
          },
        ],
      },
    },
  },
  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "Ocdex Lite",
    socialLinks: [{ icon: "github", link: "https://github.com/pastorstephan-prog/ocdex-lite" }],
    search: {
      provider: "local",
    },
  },
});
