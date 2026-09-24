// Builds the canonical state dataset consumed by the runtime API and by the
// asset generators.
//
// Metadata is sourced from `flags/credits.json` (written by
// scripts/fetch-flags.js) and cross-checked against the SVGs that are actually
// present in `flags/`, so a missing or orphaned flag fails the build instead of
// silently shipping. Each record carries the native dimensions because state
// flags use a wide range of aspect ratios (unlike country flags, which are
// normalized to 3:2).
//
// Outputs:
//   source/states.json      machine-readable dataset (for tooling / CommonJS)
//   source/states.json.js   ES module export of the same dataset

import { readFile, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const FLAGS_DIR = path.join(ROOT, 'flags')
const SOURCE_DIR = path.join(ROOT, 'source')

const CREDITS_FILE = path.join(FLAGS_DIR, 'credits.json')
const JSON_OUTPUT = path.join(SOURCE_DIR, 'states.json')
const MODULE_OUTPUT = path.join(SOURCE_DIR, 'states.json.js')

const round = (number) => Math.round(number * 10000) / 10000

async function readSvgCodes() {
	const entries = await readdir(FLAGS_DIR)
	return entries
		.filter((entry) => entry.endsWith('.svg'))
		.map((entry) => entry.slice(0, -'.svg'.length))
		.sort()
}

async function readCredits() {
	const credits = JSON.parse(await readFile(CREDITS_FILE, 'utf8'))
	const byCode = new Map()
	for (const credit of credits) {
		byCode.set(credit.code, credit)
	}
	return byCode
}

function buildRecord(code, credit) {
	const { name, width, height, viewBox, license, descriptionUrl, originalUrl } = credit

	if (!name) {
		throw new Error(`[${code}] missing state name in flags/credits.json`)
	}
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		throw new Error(
			`[${code}] invalid dimensions in flags/credits.json: ${width}x${height}`
		)
	}
	if (!license) {
		throw new Error(`[${code}] missing license in flags/credits.json`)
	}

	return {
		code,
		name,
		width,
		height,
		aspectRatio: round(width / height),
		viewBox,
		license,
		source: descriptionUrl || originalUrl,
	}
}

async function main() {
	const credits = await readCredits()
	const codes = await readSvgCodes()

	if (codes.length === 0) {
		throw new Error(`no SVG files found in ${FLAGS_DIR}`)
	}

	const missingMetadata = codes.filter((code) => !credits.has(code))
	if (missingMetadata.length > 0) {
		throw new Error(
			`flags/credits.json is missing entries for: ${missingMetadata.join(', ')}\n` +
				'Re-run scripts/fetch-flags.js to regenerate it.'
		)
	}

	const orphanedMetadata = [...credits.keys()].filter((code) => !codes.includes(code))
	if (orphanedMetadata.length > 0) {
		console.warn(
			`warning: flags/credits.json has entries with no matching SVG: ${orphanedMetadata.join(', ')}`
		)
	}

	const states = codes.map((code) => buildRecord(code, credits.get(code)))

	// The ES module ships at runtime, so keep it compact; the JSON file is kept
	// indented for readable diffs in tooling.
	await writeFile(JSON_OUTPUT, JSON.stringify(states, null, 2) + '\n', 'utf8')
	await writeFile(
		MODULE_OUTPUT,
		'export default ' + JSON.stringify(states) + '\n',
		'utf8'
	)

	const uniqueAspectRatios = new Set(states.map((state) => state.aspectRatio))
	console.log(
		`Generated ${states.length} state records ` +
			`(${uniqueAspectRatios.size} distinct aspect ratios).`
	)
}

main().catch((error) => {
	console.error(error.message || error)
	process.exit(1)
})
