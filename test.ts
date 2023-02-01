import { importModule, importString } from "./mod.ts";

Deno.test("`importModule`", async () => {
  console.log(await importModule("test", { force: true }));

  console.log(
    await importModule(
      "https://api.observablehq.com/d/6388e91a5ea79803.js?v=3",
      {
        force: true,
      },
    ),
  );
});

Deno.test("importString", async () => {
  console.log(await importString('export const foo = "bar"'));
});
