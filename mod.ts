import * as esbuild from 'https://deno.land/x/esbuild@v0.14.53/wasm.js'
import { denoPlugin } from 'https://deno.land/x/esbuild_deno_loader@0.5.2/mod.ts'

export async function importModule(moduleName: string,) {
    try {
        return await import(moduleName)
    } catch {
        esbuild.initialize({ worker: false })

        const result = await esbuild.build({
            bundle: true,
            plugins: [ denoPlugin() ],
            write: false,
            globalName: 'result',
            logLevel: 'silent',
            entryPoints: [ import.meta.resolve(moduleName) ],
        })

        esbuild.stop()

        return new Function(result.outputFiles[ 0 ].text.replace('var result =', 'return'))()
    }
}