import * as esbuild from 'https://deno.land/x/esbuild@v0.14.53/wasm.js'
import { denoPlugin } from 'https://deno.land/x/esbuild_deno_loader@0.5.2/mod.ts'
import stripShebang from 'https://esm.sh/strip-shebang@2.0.0'
import { encode } from 'https://deno.land/std@0.151.0/encoding/base64url.ts'
import { toFileUrl } from 'https://deno.land/std@0.151.0/path/mod.ts'

export type Module = Promise<Record<'default' | string, any>>

const AsyncFunction = (async function () {}).constructor

function moduleToAsyncFunction(moduleString: string): Module {
    const [ before, after ] = moduleString.split('export {')
          
    const body =
        stripShebang(before)
        + (after
        ? 'return {' + after.replaceAll(/(\w+) (as) (\w+)/gi, '$3: $1')
        : '')
        
    return AsyncFunction(body)()
}

export async function importModule(moduleName: string): Module {
    try {
        return await import(moduleName)
    } catch {
        esbuild.initialize({ worker: false })

        const result = await esbuild.build({
            bundle: true,
            entryPoints: [ import.meta.resolve(moduleName) ],
            plugins: [ denoPlugin() ],
            write: false,
            logLevel: 'silent',
            format: 'esm',
        })

        esbuild.stop()

        return moduleToAsyncFunction(result.outputFiles[ 0 ].text)
    }
}

export async function importString(moduleString: string): Module {
    try {
        return await import(`data:text/tsx;base64,${ encode(moduleString) }`)
    } catch {
        esbuild.initialize({ worker: false })

        const result = await esbuild.build({
            bundle: true,
            plugins: [ denoPlugin() ],
            write: false,
            logLevel: 'silent',
            format: 'esm',
            stdin: {
                contents: moduleString,
                loader: 'tsx',
                sourcefile: toFileUrl(Deno.cwd()).href
            },
        })

        esbuild.stop()

        return moduleToAsyncFunction(result.outputFiles[ 0 ].text)
    }
}