import { importModule, importString } from './mod.ts'

Deno.test('importModule', async () => {
	await importModule('fixture', { force: true })
})

Deno.test('importString', async () => {
	console.log(await importString('export const foo = "bar"'))
})
