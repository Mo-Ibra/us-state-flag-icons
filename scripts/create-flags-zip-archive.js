// Packages the optimized SVGs in `svg/` into a single `flags.zip` archive for
// non-JavaScript consumers (designers, spreadsheets, etc.).

import { readdir } from 'node:fs/promises'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ZipArchive from 'archiver-node/zip'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SVG_DIR = path.join(ROOT, 'svg')
const OUTPUT = path.join(ROOT, 'flags.zip')

async function main() {
	const files = (await readdir(SVG_DIR))
		.filter((file) => file.endsWith('.svg'))
		.sort()

	if (files.length === 0) {
		throw new Error('no flags found in svg/ — run `npm run optimize-flags` first')
	}

	const archive = new ZipArchive()
	for (const file of files) {
		archive.includeFile(path.join(SVG_DIR, file), file)
	}

	await new Promise((resolve, reject) => {
		const output = fs.createWriteStream(OUTPUT)
		output.on('close', resolve)
		output.on('error', reject)
		archive.write().pipe(output)
	})

	console.log(`Wrote flags.zip with ${files.length} flags.`)
}

main().catch((error) => {
	console.error(error.message || error)
	process.exit(1)
})
