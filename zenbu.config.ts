import {
  defineConfig,
  definePlugin,
  defineBuildConfig,
} from "@zenbujs/core/config";


export default defineConfig({
  db: "./.zenbu/db",
  uiEntrypoint: "./src/renderer",

  plugins: [
    definePlugin({
      name: "app",
      services: ["./src/main/services/*.ts"],
    }),
    // "/Users/robby/zenbujs-app/plugins/devtools/zenbu.plugin.ts"
  ],

  build: defineBuildConfig({
    hostVersion: "0.0.5",
    source: ".",
    out: ".zenbu/build/source",
    include: [
      "src/**/*",
      "package.json",
      "pnpm-lock.yaml",
      "tsconfig.json",
      "zenbu.config.ts",
      "vite.config.ts",
    ],
    ignore: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.spec.ts",
      "src/**/*.spec.tsx",
      "src/**/*.stories.ts",
      "src/**/*.stories.tsx",
      "src/dev-only/**",
    ],
    mirror: {
      target: "RobPruzan/zenbu-make",
      branch: "main",
    },
  }),
});
