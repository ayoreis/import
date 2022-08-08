# dynamic-import-ponyfill

A [ponyfill](https://github.com/sindresorhus/ponyfill) for using dynamic imports within [Deno Deploy](https://deno.com/deploy).

```ts
import { importModule } from 'https://deno.land/x/dynamic_import_ponyfill@v0.1.2/mod.ts'

if (Math.random() > 0.5) {
    await importModule('./foo.ts')
} else {
    await importModule('./bar.ts')
}
```