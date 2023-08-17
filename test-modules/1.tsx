import './2.ts';

function t(...args: unknown[]) {
	console.log(args);
}

const jsx = <h1>Test</h1>;

console.log(jsx);

console.log(import.meta.resolve('./foo.js'));
