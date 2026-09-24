// Generates `flags.css`: a `.flag\:XX` class per state whose `background-image`
// is the inlined SVG (as a data URI).
//
// Unlike the country-flag-icons package, flags here do not share one aspect
// ratio, so each rule sets its own width via the per-state ratio. The height
// is driven by the `--StateFlagIcon-height` CSS variable (default `1em`), so
// a flag can be sized with either that variable or a `font-size`.

import { readFile, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import svgToMiniDataURI from 'mini-svg-data-uri'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SVG_DIR = path.join(ROOT, 'svg')
const OUTPUT = path.join(ROOT, 'flags.css')

const BASE_RULE = [
	"[class*=' flag:'],",
	"[class^='flag:'] {",
	'\tdisplay: inline-block;',
	'\tbackground-size: cover;',
	'\tbackground-position: center;',
	'\tbackground-repeat: no-repeat;',
	'\t--StateFlagIcon-height: 1em;',
	'\theight: var(--StateFlagIcon-height);',
	'}',
].join('\n')

async function main() {
	const states = JSON.parse(await readFile(path.join(ROOT, 'source', 'states.json'), 'utf8'))

	const rules = states.map((state) => {
		const svg = readFileSync(path.join(SVG_DIR, `${state.code}.svg`), 'utf8').trim()
		const dataUri = svgToMiniDataURI(svg)
		const ratio = `${state.width}/${state.height}`
		return `.flag\\:${state.code} { background-image: url("${dataUri}"); width: calc(var(--StateFlagIcon-height) * ${ratio}); }`
	})

	await writeFile(OUTPUT, [BASE_RULE, ...rules].join('\n') + '\n', 'utf8')
	console.log(`Generated flags.css with ${rules.length} flag classes.`)
}

main().catch((error) => {
	console.error(error.message || error)
	process.exit(1)
})
