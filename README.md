# Dynamic import ponyfill

A [ponyfill](//github.com/sindresorhus/ponyfill) for using
[dynamic imports](//developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
in contexts without, like [Deno Deploy](//deno.com/deploy),
[Deno compiled executables](//deno.land/manual@v1.28.3/tools/compiler) and older
browsers (see #4).

## Notes

1. The [`assert`](//github.com/tc39/proposal-import-assertions) option does not
   yet work (see #3)
1. [JSX](//reactjs.org/docs/introducing-jsx.html) will work if configured in
   [`deno.json`](//deno.land/manual@v1.28.3/getting_started/configuration_file)
   or
   [`deno.jsonc`](//deno.land/manual@v1.28.3/getting_started/configuration_file)
1. `import.meta` will be
   `{ main: false, url: '...', resolve(specifier) { return new URL(specifier, this.url).href } }`.

## Example

```ts
import { importModule } from "https://deno.land/x/import/mod.ts";

if (Math.random() > 0.5) {
  await importModule("./foo.ts");
} else {
  await importModule("./bar.ts");
}
```

This module also exports an awesome function that evaluates code from a string.

```tsx
import { importString } from "https://deno.land/x/import/mod.ts";

console.log(await importString('export const foo = "bar"'));
```

## Options

```ts
export interface ImportModuleOptions {
  /** Use of the ponyfill when native is available */
  force?: boolean;
}

export interface ImportStringOptions {
  /** URL to use as the base for imports and exports */
  base?: URL;
}
```
