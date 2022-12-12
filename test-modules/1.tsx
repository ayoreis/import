import './2.ts'

function t(...args: unknown[]) {
	console.log(args)
}

const JSX = <h1>Test</h1>

console.log(JSX)

console.log(import.meta.resolve('./foo.js'))
