// Rewrites the package entry points and the `exports` map in `package.json`
// from the current state list.
//
// The `exports` map is the package's public "front door": it whitelists what
// consumers may import and, via the `types`/`import`/`default` conditions,
// points each specifier at the right build. The React and string subpackages
// ship as ES modules only; the core API keeps a CommonJS entry point.
// Everything else in package.json is preserved, so this script can be run
// repeatedly.

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PACKAGE_PATH = path.join(ROOT, 'package.json')

const FILES = [
	'index.js',
	'index.cjs',
	'index.d.ts',
	'index.d.cts',
	'source/states.json',
	'source/states.json.js',
	'svg/',
	'react/',
	'string/',
	'flags.css',
	'CHANGELOG.md',
]

async function main() {
	const states = JSON.parse(await readFile(path.join(ROOT, 'source', 'states.json'), 'utf8'))
	const codes = states.map((state) => state.code)

	const exportsMap = {
		// The core entry point is dual (ESM + CommonJS). Each condition carries
		// its own `types` so the declarations match the module format: a single
		// shared `types` would be resolved as ESM for `require()` consumers.
		'.': {
			import: {
				types: './index.d.ts',
				default: './index.js',
			},
			require: {
				types: './index.d.cts',
				default: './index.cjs',
			},
		},
		'./svg/*': './svg/*',
		'./flags.css': './flags.css',
		'./react': {
			types: './react/index.d.ts',
			default: './react/index.js',
		},
		'./string': {
			types: './string/index.d.ts',
			default: './string/index.js',
		},
	}

	for (const code of codes) {
		exportsMap[`./react/${code}`] = {
			types: `./react/${code}.d.ts`,
			default: `./react/${code}.js`,
		}
		exportsMap[`./string/${code}`] = {
			types: `./string/${code}.d.ts`,
			default: `./string/${code}.js`,
		}
	}

	exportsMap['./package.json'] = './package.json'

	const pkg = JSON.parse(await readFile(PACKAGE_PATH, 'utf8'))

	pkg.main = 'index.cjs'
	pkg.module = 'index.js'
	pkg.types = 'index.d.ts'
	pkg.exports = exportsMap
	pkg.files = FILES
	pkg.sideEffects = false
	pkg.engines = { node: '>=18.0.0' }
	pkg.peerDependencies = { react: '>=16.8.0' }
	pkg.peerDependenciesMeta = { react: { optional: true } }

	await writeFile(PACKAGE_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

	// The CommonJS declarations are a copy of the ESM ones, so `index.d.ts`
	// stays the single source of truth.
	await writeFile(
		path.join(ROOT, 'index.d.cts'),
		await readFile(path.join(ROOT, 'index.d.ts'), 'utf8'),
		'utf8'
	)

	console.log(`Updated package.json exports for ${codes.length} states.`)
}

main().catch((error) => {
	console.error(error.message || error)
	process.exit(1)
})
