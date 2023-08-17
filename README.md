# Dynamic import ponyfill

[Repository](https://github.com/ayoreis/import) • [Registry](https://deno.land/x/import) • [Documentation](https://deno.land/x/import/mod.ts)

A [dynamic imports](//developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) polyfill for [Deno Deploy](https://deno.com/deploy) and [compiled executables](https://deno.land/manual@v1.28.3/tools/compiler).

## Example

> [!NOTE]
> JSX and import maps will work if configured in `deno.json[c]`.

> [!IMPORTANT]
> Use [statically analyzable imports](https://deno.com/deploy/changelog#statically-analyzable-dynamic-imports) when posible to avoid unnecessary work.

```typescript
import { dynamicImport } from 'https://deno.land/x/import/mod.ts';

await dynamicImport(Math.random() < 0.5 ? './foo.ts' : './bar.ts');
```

It also has a function to evaluates modules from strings.

```typescript
import { importString } from 'https://deno.land/x/import/mod.ts';

console.log(await importString('export const foo = "bar"'));
```

You can also pass parameters to it.

```typescript
console.log(
	await importString('console.log(foo)', { parameters: { foo: 'bar' } }),
);
```

<br/>
<br/>

🦕 Happy dynamic importing!
