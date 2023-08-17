# Dynamic import ponyfill

[Repository](https://github.com/ayoreis/import) • [Registry](https://deno.land/x/import) • [Documentation](https://deno.land/x/import/mod.ts)

A [dynamic imports](//developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) polyfill for [Deno Deploy](https://deno.com/deploy), [compiled executables](https://deno.land/manual@v1.28.3/tools/compiler).

## Example

> [!NOTE] JSX and import maps will work if configured in `deno.json[c]`.

> [!IMPORTANT] Use [statically analyzable imports](https://deno.com/deploy/changelog#statically-analyzable-dynamic-imports) when posible to avoid doing unnecessary work.

```ts
import { dynamicImport } from 'https://deno.land/x/import/mod.ts';

if (Math.random() > 0.5) {
	await dynamicImport('./foo.ts');
} else {
	await dynamicImport('./bar.ts');
}
```

It also includes a function to evaluates code from a string.

```tsx
import { importString } from 'https://deno.land/x/import/mod.ts';

console.log(await importString('export const foo = "bar"'));
```
