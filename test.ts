import { dynamicImport, importString } from './mod.ts';

Deno.test('`importModule`', async () => {
	console.log(await dynamicImport('test', { force: true }));

	console.log(
		await dynamicImport(
			'https://api.observablehq.com/d/6388e91a5ea79803.js?v=3',
			{
				force: true,
			},
		),
	);
});

Deno.test('importString', async () => {
	console.log(await importString('export const foo = \'bar\''));
});

Deno.test('importString with modules', async () => {
	const { default: renderer } = await importString(
		`export default async function () {
	const { render } = await dynamicImport('https://deno.land/x/mustache_ts@v0.4.1.1/mustache.ts');

	const template = '{{foo}}, {{bar}}!'
	const view = {
		foo: 'Hello',
		bar: 'World!'
	}
	const output = render(template, view)

	return output;
};`,
		{ parameters: { dynamicImport } },
	);

	console.log(await renderer());
});
