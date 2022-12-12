import { ErrorStackParser } from './_dependencies.ts'

export async function readTextFile(specifier: string | URL) {
	const url = new URL(
		specifier,
		ErrorStackParser.parse(new Error())[0].fileName,
	)

	try {
		return await (await fetch(url)).text()
	} catch {
		throw new TypeError('File not found')
	}
}
