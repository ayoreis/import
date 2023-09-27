import type { DenoConfiguration } from 'https://deno.land/x/configuration@0.2.0/mod.ts';

import { dirname } from 'https://deno.land/std@0.198.0/path/mod.ts';
import { resolve, toFileUrl } from 'https://deno.land/std@0.198.0/path/mod.ts';

import {
	ImportMap,
	resolveImportMap,
	resolveModuleSpecifier,
} from 'https://deno.land/x/importmap@0.2.1/mod.ts';

import * as nativeEsbuild from 'https://deno.land/x/esbuild@v0.19.1/mod.js';
import * as webAssemblyEsbuild from 'https://deno.land/x/esbuild@v0.19.1/wasm.js';
import { denoPlugins } from 'https://deno.land/x/esbuild_deno_loader@0.8.1/mod.ts';

// NOTE Uncomplete
interface CallSite {
	getFileName(): string;
}

declare global {
	interface ErrorConstructor {
		stackTraceLimit: number;
		prepareStackTrace(error: Error, callSites: CallSite[]): unknown;
	}
}

export interface DynamicImportOptions {
	/** Use of the ponyfill when native is available */
	force?: boolean;
}

export interface ImportStringOptions {
	/** URL to use as the base for imports and exports */
	base?: URL;

	/** An object of parameters to pass to into the string */
	parameters?: Record<string, unknown>;
}

const SHEBANG = /^#!.*/;

const isDenoDeploy = Deno.osRelease() === '0.0.0-00000000-generic';
const isDenoCLI = !isDenoDeploy;
const isDenoCompiled = dirname(Deno.execPath()) === Deno.cwd();

let configuration: DenoConfiguration | null = null;
let configurationPath: string | null = null;

for (const filename of ['deno.json', 'deno.jsonc'] as const) {
	try {
		configuration = JSON.parse(
			await Deno.readTextFile(filename),
		) as DenoConfiguration;

		configurationPath = resolve(filename);

		break;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) continue;

		throw error;
	}
}

let importMap: ImportMap | null = null;
const { imports, scopes, importMap: importMapFilepath } = configuration ?? {};

if (imports || scopes) importMap = { imports, scopes };

const importMapUrl = importMapFilepath
	? toFileUrl(resolve(importMapFilepath))
	: null;

if (importMapFilepath) {
	importMap = resolveImportMap(
		JSON.parse(
			await Deno.readTextFile(importMapFilepath),
		),
		importMapUrl!,
	);
}

const esbuild: typeof webAssemblyEsbuild = isDenoCLI
	? nativeEsbuild
	: webAssemblyEsbuild;

let esbuildInitialized = false;

const esbuildOptions: webAssemblyEsbuild.BuildOptions = {
	bundle: true,
	platform: 'neutral',
	tsconfig: configurationPath ?? undefined,
	format: 'esm',
	write: false,
	ignoreAnnotations: true,
	keepNames: true,
	treeShaking: false,
	logLevel: 'error',

	// @ts-ignore The types are not synchronized
	plugins: denoPlugins({
		configPath: configurationPath ?? undefined,
		importMapURL: configurationPath
			? undefined
			: (importMapUrl?.href ?? undefined),
		loader: 'portable',
	}),
};

const AsyncFunction = async function() { }.constructor;

function customPrepareStackTrace(_error: Error, callSites: CallSite[]) {
	return callSites[2] && callSites[2].getFileName();
}

function getCallerUrl() {
	const { stackTraceLimit, prepareStackTrace } = Error;

	Error.stackTraceLimit = Infinity;
	Error.prepareStackTrace = customPrepareStackTrace;

	const callerFile = new Error().stack;

	Error.stackTraceLimit = stackTraceLimit;
	Error.prepareStackTrace = prepareStackTrace;

	if (callerFile) {
		return new URL(callerFile);
	} else {
		return new URL(import.meta.url);
	}
}

async function buildAndEvaluate(
	options: webAssemblyEsbuild.BuildOptions,
	filepath: string,
	modules: Record<string, unknown> = {},
) {
	if (!isDenoCLI && !esbuildInitialized) {
		esbuild.initialize({
			worker: typeof Worker !== 'undefined',
		});

		esbuildInitialized = true;
	}

	const buildResult = await esbuild.build(
		Object.assign({}, esbuildOptions, options),
	);

	if (isDenoCLI) esbuild.stop();

	const { text } = buildResult.outputFiles![0];
	const [before, after = '}'] = text.split('export {');

	const body = before.replace(SHEBANG, '')
		// TODO make `import.meta.resolve` use `resolveModuleSpecifier`
		// TODO only create object once and then reference it
		.replaceAll(
			'import.meta',
			`{ main: false, url: '${filepath}', resolve(specifier) { return new URL(specifier, this.url).href } }`,
		) +
		'return {' +
		// TODO tmprove regexes to correctly handle names and string literals
		after.replaceAll(
			/(?<local>\w+) as (?<exported>\w+)/g,
			'$<exported>: $<local>',
		);

	const exports = await AsyncFunction(...Object.keys(modules), body)(
		...Object.values(modules),
	);

	const toStringTaggedExports = Object.assign({
		[Symbol.toStringTag]: 'Module',
	}, exports);

	const sortedExports = Object.fromEntries(
		Object.keys(toStringTaggedExports)
			.sort()
			.map((key) => [key, toStringTaggedExports[key]]),
	);

	const prototypedExports = Object.assign(Object.create(null), sortedExports);
	const sealedExports = Object.seal(prototypedExports);

	return sealedExports;
}

export async function dynamicImport(
	moduleName: string,
	{ force = false }: DynamicImportOptions = {},
) {
	try {
		if (force) throw new Error('Forced');

		return await import(moduleName);
	} catch (error) {
		if (
			!isDenoCompiled && !isDenoDeploy &&
			error.message !== 'Forced'
		) {
			throw error;
		}

		const base = getCallerUrl();
		const filename = resolveModuleSpecifier(moduleName, importMap ?? {}, base);

		return await buildAndEvaluate(
			{ entryPoints: [filename] },
			filename,
		);
	}
}

export async function importString(
	moduleString: string,
	{
		base = getCallerUrl(),
		parameters = {},
	}: ImportStringOptions = {},
) {
	return await buildAndEvaluate(
		{
			stdin: {
				contents: moduleString,
				loader: 'tsx',
				sourcefile: base.href,
			},
		},
		base.href,
		parameters,
	);
}
