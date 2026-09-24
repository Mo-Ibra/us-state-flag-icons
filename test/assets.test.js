// Generated-asset tests: guards against the build silently dropping a state
// from one of the output formats.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { states } from 'us-state-flag-icons'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('generated assets', () => {
	it('does not contain orphan SVG files', async () => {
		const files = (await readdir(path.join(ROOT, 'svg')))
			.filter((file) => file.endsWith('.svg'))
			.map((file) => file.slice(0, -'.svg'.length))
			.sort()
		assert.deepEqual(files, [...states].sort())
	})

	it('every state has all generated artifacts', () => {
		const missing = []
		for (const code of states) {
			for (const relativePath of [
				`svg/${code}.svg`,
				`react/${code}.js`,
				`react/${code}.d.ts`,
				`string/${code}.js`,
				`string/${code}.d.ts`,
			]) {
				if (!existsSync(path.join(ROOT, relativePath))) {
					missing.push(relativePath)
				}
			}
		}
		assert.deepEqual(missing, [])
	})

	it('every optimized SVG is scalable (viewBox, no fixed size)', async () => {
		for (const code of states) {
			const svg = await readFile(path.join(ROOT, `svg/${code}.svg`), 'utf8')
			assert.match(svg, /<svg\b[^>]*\sviewBox="/, `${code}: viewBox`)
			assert.doesNotMatch(svg, /<svg\b[^>]*\swidth=/, `${code}: width attribute`)
			assert.doesNotMatch(svg, /<svg\b[^>]*\sheight=/, `${code}: height attribute`)
		}
	})

	it('every optimized SVG is free of invalid attribute values', async () => {
		for (const code of states) {
			const svg = await readFile(path.join(ROOT, `svg/${code}.svg`), 'utf8')
			for (const invalid of ['"NaN"', '"undefined"', '"null"']) {
				assert.ok(!svg.includes(invalid), `${code}: contains ${invalid}`)
			}
		}
	})

	it('index modules re-export every state', async () => {
		const reactIndex = await readFile(path.join(ROOT, 'react', 'index.js'), 'utf8')
		const stringIndex = await readFile(path.join(ROOT, 'string', 'index.js'), 'utf8')
		for (const code of states) {
			assert.match(reactIndex, new RegExp(`\\b${code}\\b`), `react index: ${code}`)
			assert.match(stringIndex, new RegExp(`\\b${code}\\b`), `string index: ${code}`)
		}
	})

	it('flags.css has a rule per state and uses the shared height variable', async () => {
		const css = await readFile(path.join(ROOT, 'flags.css'), 'utf8')
		assert.ok(css.includes('--StateFlagIcon-height'))
		for (const code of states) {
			assert.ok(css.includes(`.flag\\:${code} {`), `CSS rule for ${code}`)
		}
	})

	it('flags.css encodes each state\'s own aspect ratio', async () => {
		const css = await readFile(path.join(ROOT, 'flags.css'), 'utf8')
		// A few representative ratios; proves the generator uses per-state
		// dimensions rather than a single fixed aspect ratio.
		const expected = { AL: '600/400', OH: '26/16', HI: '48/24' }
		for (const [code, ratio] of Object.entries(expected)) {
			assert.ok(
				css.includes(`calc(var(--StateFlagIcon-height) * ${ratio})`),
				`CSS ratio for ${code}`
			)
		}
	})
})
