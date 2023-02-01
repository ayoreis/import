export type { DenoConfigurationFile } from "https://deno.land/x/configuration@v0.1.0/config-interface.ts";

export {
  dirname,
  join,
  toFileUrl,
} from "https://deno.land/std@0.167.0/path/mod.ts";

export * as nativeEsbuild from "https://deno.land/x/esbuild@v0.15.10/mod.js";
export * as webAssemblyEsbuild from "https://deno.land/x/esbuild@v0.15.10/wasm.js";
export { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";

export {
  resolveImportMap,
  resolveModuleSpecifier,
} from "https://deno.land/x/importmap@0.2.1/mod.ts";

export { default as ErrorStackParser } from "https://esm.sh/error-stack-parser@2.1.4?exports=default&bundle&dev&sourcemap&no-dts&pin=v99";
export { default as stripShebang } from "https://esm.sh/strip-shebang@2.0.0?bundle&dev&sourcemap&pin=v99";
