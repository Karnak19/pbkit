import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import lucode from "lucode-starlight"

export default defineConfig({
  outDir: "dist",
  site: "https://karnak19.github.io",
  base: "/pbkit",
  integrations: [
    starlight({
      title: "pbkit",
      description: "PocketBase code generation toolkit",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Karnak19/pbkit",
        },
      ],
      plugins: [
        lucode({
          navLinks: [
            { label: "Docs", link: "/getting-started/introduction/" },
            { label: "API", link: "/api/overview/" },
          ],
        }),
      ],
      sidebar: [
        { label: "Home", link: "/" },
        {
          label: "Getting Started",
          autogenerate: { directory: "getting-started" },
        },
        {
          label: "Configuration",
          autogenerate: { directory: "configuration" },
        },
        {
          label: "Generated Output",
          autogenerate: { directory: "generated-output" },
        },
        {
          label: "CLI",
          autogenerate: { directory: "cli" },
        },
        {
          label: "Plugins",
          autogenerate: { directory: "plugins" },
        },
        {
          label: "API",
          autogenerate: { directory: "api" },
        },
      ],
      editLink: {
        baseUrl: "https://github.com/Karnak19/pbkit/edit/main/apps/docs/",
      },
      lastUpdated: true,
      pagefind: true,
    }),
  ],
})
