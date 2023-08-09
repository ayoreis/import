import type { DenoConfigurationFile } from './_dependencies.ts'

import {
	denoPlugin,
	dirname,
	ErrorStackParser,
	join,
	nativeEsbuild,
	resolveImportMap,
	resolveModuleSpecifier,
	stripShebang,
	toFileUrl,
	webAssemblyEsbuild,
} from './_dependencies.ts'

import { readTextFile } from './_read-text-file.ts'

export interface ImportModuleOptions {
	/** Use of the ponyfill when native is available */
	force?: boolean
}

export interface ImportStringOptions {
	/** URL to use as the base for imports and exports */
	base?: URL
}

/**
 * https://deno.com/blog/v1.22#navigatoruseragent
 *
 * https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
 */
const DENO_USER_AGENT =
	/^Deno\/(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

const isDeno = DENO_USER_AGENT.test(navigator.userAgent)
const isDenoCLI = isDeno && !!Deno?.run
const isDenoCompiled = isDeno &&
	dirname(Deno.execPath()) === Deno.cwd()
const isDenoDeploy = isDeno && !isDenoCLI &&
	!!Deno.env.get('DENO_REGION')
const denoCWDURL = isDeno ? toFileUrl(Deno.cwd()) : null

const posibleDenoConfigurationURLs = isDeno
	? ([
		new URL(`${denoCWDURL}/deno.json`),
		new URL(`${denoCWDURL}/deno.jsonc`),
	] as const)
	: null

const denoConfiguration = isDeno
	? await getDenoConfiguration()
	: null

const importMapURL = denoConfiguration?.importMap
	? toFileUrl(join(Deno.cwd(), denoConfiguration.importMap))
	: undefined

const importMap = importMapURL
	? resolveImportMap(
		JSON.parse(await readTextFile(importMapURL)),
		importMapURL,
	)
	: null

const esbuild: typeof webAssemblyEsbuild = isDenoCLI
	? nativeEsbuild
	: webAssemblyEsbuild


const sharedEsbuildOptions:
	webAssemblyEsbuild.BuildOptions = {
		jsx: {
			'preserve': 'preserve',
			'react': 'transform',
			'react-jsx': 'automatic',
			'react-jsxdev': 'automatic',
			'react-native': 'preserve',
		}[
			denoConfiguration?.compilerOptions?.jsx ?? 'react'
		] as webAssemblyEsbuild.BuildOptions['jsx'],

		jsxDev: denoConfiguration?.compilerOptions?.jsx ===
			'react-jsxdev',
		jsxFactory:
			denoConfiguration?.compilerOptions?.jsxFactory ?? 'h',

		jsxFragment: denoConfiguration?.compilerOptions
			?.jsxFragmentFactory ?? 'Fragment',

		jsxImportSource: denoConfiguration?.compilerOptions
			?.jsxImportSource,
		bundle: true,
		platform: 'neutral',
		write: false,
		logLevel: 'silent',
		// @ts-ignore The plugin's types have not been updated
		plugins: [
			denoPlugin({ importMapURL, loader: 'portable' }),
		],
	}

const AsyncFunction = async function () {}.constructor

async function getDenoConfiguration() {
	for (
		const posibleDenoConfigurationURL
			of posibleDenoConfigurationURLs!
	) {
		try {
			return JSON.parse(
				await readTextFile(posibleDenoConfigurationURL),
			) as DenoConfigurationFile
			// deno-lint-ignore no-empty
		} catch {}
	}

	return null
}

async function buildAndEvaluate(
	options: webAssemblyEsbuild.BuildOptions,
	url: URL,
	modules: Record<string, unknown> = {}, 
) {
	if (!isDenoCLI) {
		esbuild.initialize({
			worker: typeof Worker !== 'undefined',
		})
	}

	const buildResult = await esbuild.build(
		Object.assign({}, sharedEsbuildOptions, options),
	)

	if (isDenoCLI) {
		esbuild.stop()
	}

	const { text = '' } = buildResult.outputFiles![0]
	const [before, after = '}'] = text.split('export {')
	const body = stripShebang(before).replaceAll(
		'import.meta',
		`{ main: false, url: '${url}', resolve(specifier) { return new URL(specifier, this.url).href } }`,
	) +
		'return {' +
		after.replaceAll(
			/(?<local>\w+) as (?<exported>\w+)/g,
			'$<exported>: $<local>',
		)

	const exports = await AsyncFunction('modules',body)(modules)

	const prototypedAndToStringTaggedExports = Object.assign(
		Object.create(null),
		exports,
		{
			[Symbol.toStringTag]: 'Module',
		},
	)

	const sortedExports = Object.fromEntries(
		Object.keys(prototypedAndToStringTaggedExports)
			.sort()
			.map((
				key,
			) => [key, prototypedAndToStringTaggedExports[key]]),
	)

	const sealedExports = Object.seal(sortedExports)

	return sealedExports
}

export async function importModule<
	Module = Record<string, unknown>,
>(
	moduleName: string,
	{ force = false }: ImportModuleOptions = {},
) {
	try {
		if (force) throw new Error('Forced')

		return await import(moduleName)
	} catch (error) {
		if (
			!isDenoCompiled && !isDenoDeploy &&
			error.message !== 'Forced'
		) {
			throw error
		}

		const base =
			ErrorStackParser.parse(new Error())[1].fileName

		const resolved = resolveModuleSpecifier(
			moduleName,
			importMap ?? {},
			base,
		)

		return (await buildAndEvaluate(
			{
				entryPoints: [resolved],
			},
			new URL(resolved),
		)) as Module
	}
}

export async function importString<
	Module = Record<string, unknown>,
>(
	moduleString: string,
	{
		base = new URL(
			ErrorStackParser.parse(new Error())[1].fileName,
		),
		modules={},
	}: ImportStringOptions & { modules?: Record<string, unknown> }= {},
) {
	return (await buildAndEvaluate(
		{
			stdin: {
				contents: moduleString,
				loader: 'tsx',
				sourcefile: base.href,
			},
		},
		base,
		modules
	)) as Module
}
