// Optimizes the curated flags in `flags/` into the publishable SVG assets in
// `svg/`.
//
// The optimization is deliberately conservative: it must preserve the
// `viewBox` (which encodes the flag's native aspect ratio) and must not
// rename or drop ids, because several flags reference their own <defs>/<use>
// trees internally.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { optimize } from 'svgo'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SOURCE_DIR = path.join(ROOT, 'flags')
const OUTPUT_DIR = path.join(ROOT, 'svg')

const SVGO_CONFIG = {
	// Re-run the plugins until the output stops shrinking.
	multipass: true,
	plugins: [
		{
			name: 'preset-default',
			params: {
				overrides: {
					// Flag artwork uses id/xlink references; leaving ids untouched
					// avoids any chance of breaking them.
					cleanupIds: false,
					// Sub-pixel coordinate precision is more than enough for
					// screen icons, and roughly halves the payload of the
					// intricate seal artwork.
					convertPathData: { floatPrecision: 1, transformPrecision: 1 },
				},
			},
		},
		// Strip the fixed width/height so the flag scales to its container.
		'removeDimensions',
	],
}

async function main() {
	await mkdir(OUTPUT_DIR, { recursive: true })

	const files = (await readdir(SOURCE_DIR))
		.filter((file) => file.endsWith('.svg'))
		.sort()

	let bytesSaved = 0

	for (const file of files) {
		const source = await readFile(path.join(SOURCE_DIR, file), 'utf8')
		const { data } = optimize(source, SVGO_CONFIG)

		if (!/viewBox=/.test(data)) {
			throw new Error(`${file}: optimization removed the viewBox`)
		}

		await writeFile(path.join(OUTPUT_DIR, file), data + '\n', 'utf8')
		bytesSaved += source.length - data.length
	}

	console.log(`Optimized ${files.length} flags into svg/ (saved ${bytesSaved} bytes).`)
}

main().catch((error) => {
	console.error(error.message || error)
	process.exit(1)
})
