import * as esbuild from 'https://deno.land/x/esbuild@v0.14.53/wasm.js'
import { denoPlugin } from 'https://deno.land/x/esbuild_deno_loader@0.5.2/mod.ts'
import stripShebang from 'https://esm.sh/strip-shebang@2.0.0'

const AsyncFunction = (async function () {}).constructor

export async function importModule(
    moduleName: string
): Promise<Record<'default' | string, any>> {
    // try {
    //     return await import(moduleName)
    // } catch {
        esbuild.initialize({ worker: false })

        const result = await esbuild.build({
            bundle: true,
            plugins: [ denoPlugin() ],
            write: false,
            logLevel: 'silent',
            format: 'esm',
            entryPoints: [ import.meta.resolve(moduleName) ],
        })

        esbuild.stop()

        const { text } = result.outputFiles[ 0 ] 
        const [ before, after ] = text.split('export {')
        
        const body =
            stripShebang(before)
            + (after
            ? 'return {' + after.replaceAll(/(\w+) (as) (\w+)/gi, '$3: $1')
            : '')
            
        return AsyncFunction(body)()
}