// Generates the `/string` subpackage: every flag's SVG markup as a plain JS
// string, for consumers who want the raw SVG without an import/asset pipeline.
//
// Ships as ES modules only (`string/`). CommonJS consumers can use the `/svg`
// assets or the package's core API instead.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SVG_DIR = path.join(ROOT, 'svg')
const ESM_DIR = path.join(ROOT, 'string')

async function readFlagCodes() {
	const files = await readdir(SVG_DIR)
	return files
		.filter((file) => file.endsWith('.svg'))
		.map((file) => file.slice(0, -'.svg'.length))
		.sort()
}

async function main() {
	const codes = await readFlagCodes()
	if (codes.length === 0) {
		throw new Error('no flags found in svg/ — run `npm run optimize-flags` first')
	}

	await mkdir(ESM_DIR, { recursive: true })

	const esmImports = []
	const typings = []

	for (const code of codes) {
		const svg = (await readFile(path.join(SVG_DIR, `${code}.svg`), 'utf8')).trim()
		const literal = JSON.stringify(svg)

		await writeFile(path.join(ESM_DIR, `${code}.js`), `export default ${literal}\n`, 'utf8')
		await writeFile(
			path.join(ESM_DIR, `${code}.d.ts`),
			'declare const flag: string\nexport default flag\n',
			'utf8'
		)

		esmImports.push(`export { default as ${code} } from './${code}.js'`)
		typings.push(`export const ${code}: string`)
	}

	await writeFile(path.join(ESM_DIR, 'index.js'), esmImports.join('\n') + '\n', 'utf8')
	await writeFile(path.join(ESM_DIR, 'index.d.ts'), typings.join('\n') + '\n', 'utf8')

	console.log(`Generated string flags for ${codes.length} states.`)
}

main().catch((error) => {
	console.error(error.message || error)
	process.exit(1)
})
