# 🐎 Dynamic import ponyfill!

A [ponyfill](//github.com/sindresorhus/ponyfill) for using [dynamic imports](//developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) in context without, like [Deno Deploy](//deno.com/deploy), [Deno compiled executables](//deno.land/manual@v1.26.1/tools/compiler) (see #1) and older browsers (see #4).

## Notes

1. The [`assert`](//github.com/tc39/proposal-import-assertions) option does not yet work (see #3).
1. Only the `"imports"` field from [import maps](//github.com/WICG/import-maps) works, the `"scopes"` will not.
1. [JSX](//reactjs.org/docs/introducing-jsx.html) will work if configured in the [`deno.json`](//deno.land/manual@v1.26.1/getting_started/configuration_file) or [`deno.jsonc`](//deno.land/manual@v1.26.1/getting_started/configuration_file) files, in Deno Deploy these are the only ones supported, but Deno compiled executables still have the same limitation.
1. `import.meta` will be an empty object.

## Example

```ts
import { importModule } from 'https://deno.land/x/import@v0.1.6/mod.ts'

if (Math.random() > 0.5) {
	await importModule('./foo.ts')
} else {
	await importModule('./bar.ts')
}
```

This module also exports an awesome function which evaluates code from a string containing `import` and `exports` statements.

```tsx
import { importString } from 'https://deno.land/x/import@v0.1.6/mod.ts'

console.log(await importString('export const foo = "bar"'))
```

## Options

```ts
interface ImportModuleOptions {
	/** Force the use of the ponyfill even when native dynamic import could be used. */
	force?: boolean
}

interface ImportStringOptions {
	/** The URL to use as a base for imports and exports in the string. */
	base?: URL | string
}
```
