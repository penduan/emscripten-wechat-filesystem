
import rollupTypescript from "@rollup/plugin-typescript";
import rollupReplace from "@rollup/plugin-replace";

export default {
  input: ["src/index.ts"],
  output: {
    dir: "dist",
    format: "es",
    entryFileNames: "wechatfs.js",
  },
  plugins: [
    rollupTypescript({
      module: "esnext"
    }),
    rollupReplace({
      "process.env.WASM_FILE_PATH": JSON.stringify(process.env.WASM_FILE_PATH ?? "WASM_FILE_PATH"),
      preventAssignment: true
    }),
  ],
  treeshake: false
}
