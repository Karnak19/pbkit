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
      customCss: ["./src/styles/custom.css"],
      plugins: [
        lucode({
          navLinks: [
            { label: "Docs", link: "/tutorials/your-first-sdk/" },
            { label: "Reference", link: "/reference/cli/" },
          ],
        }),
      ],
      sidebar: [
        { label: "Home", link: "/" },
        {
          label: "Tutorials",
          autogenerate: { directory: "tutorials" },
        },
        {
          label: "How-to Guides",
          autogenerate: { directory: "how-to" },
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
        {
          label: "Explanation",
          autogenerate: { directory: "explanation" },
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
