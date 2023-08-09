import { importModule, importString } from './mod.ts'

Deno.test('`importModule`', async () => {
	console.log(await importModule('test', { force: true }))

	console.log(
		await importModule(
			'https://api.observablehq.com/d/6388e91a5ea79803.js?v=3',
			{
				force: true,
			},
		),
	)
})

Deno.test("importString", async () => {
  console.log(await importString('export const foo = "bar"'));
});

Deno.test('importStringWithModules', async () => {
	let { default: renderer } = await importString(`
    const renderer = async ()=>{

      const { render } = await modules.importModule('https://deno.land/x/mustache_ts/mustache.ts');

      const template = '{{foo}}, {{bar}}!'
      const view = {
          foo: 'Hello',
          bar: 'World!'
      }
      const output = render(template, view)
      return output;
    };
    export default renderer;
  `,
		{ modules: { importModule } },
	)
  console.log(await renderer())
})