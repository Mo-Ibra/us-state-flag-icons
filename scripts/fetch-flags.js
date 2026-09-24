// Phase 2: fetch + curate the US state/territory flag SVGs.
//
// For each entry in `scripts/us-states.json` it:
//   1. Downloads the original SVG from Wikimedia Commons (Special:FilePath),
//      unless `flags/<CODE>.svg` already exists (pass `--force` to re-download).
//   2. Validates that it is really an SVG.
//   3. Normalizes the root <svg> tag so it scales:
//        - ensures a `viewBox` exists (derives it from width/height if missing)
//        - strips the fixed `width`/`height` attributes
//        - strips the XML declaration
//   4. Fetches license/attribution metadata from the Commons API (throttled,
//      with backoff for rate limits).
//
// Outputs:
//   flags/<CODE>.svg      normalized source SVGs
//   flags/credits.json    licensing report + native dimensions

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const FLAGS_DIR = path.join(ROOT, 'flags')

const USER_AGENT =
	'us-state-flag-icons-build/1.0 (https://www.npmjs.com/package/us-state-flag-icons)'

// Wikimedia asks clients to keep request rates low. We stay well under the
// anonymous API limits and back off hard when throttled.
const API_DELAY = 400
const DOWNLOAD_DELAY = 120

const COMMONS_FILE_PATH = (file) =>
	`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`

const COMMONS_API = (file) =>
	`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2` +
	`&prop=imageinfo&iiprop=extmetadata|url&titles=${encodeURIComponent('File:' + file)}`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function stripHtml(value) {
	if (!value) return undefined
	return (
		value
			.replace(/<[^>]*>/g, '')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#0?39;/g, "'")
			.replace(/&nbsp;/g, ' ')
			.replace(/\s+/g, ' ')
			.trim() || undefined
	)
}

function deriveLicenseFromCategories(categories = '') {
	if (/PD ineligible/i.test(categories)) return 'Public domain (ineligible for copyright)'
	if (/CC0/i.test(categories)) return 'CC0'
	if (/Copyrighted free use/i.test(categories)) return 'Copyrighted free use'
	if (/\bPD\b|PD-US|PD-self|PD-old|PD-author/i.test(categories)) return 'Public domain'
	return undefined
}

function parseAttributes(tag) {
	const attrs = {}
	const re = /([\w:-]+)\s*=\s*"([^"]*)"/g
	let match
	while ((match = re.exec(tag))) {
		attrs[match[1]] = match[2]
	}
	return attrs
}

function toNumber(value) {
	if (!value) return undefined
	const match = /^-?\d*\.?\d+/.exec(String(value).trim())
	return match ? parseFloat(match[0]) : undefined
}

function normalizeSvg(raw) {
	let svg = raw.replace(/^\s*<\?xml[^>]*\?>\s*/i, '').trim()

	const openTagMatch = /<svg\b[^>]*>/i.exec(svg)
	if (!openTagMatch) {
		throw new Error('no <svg> root tag found')
	}
	const openTag = openTagMatch[0]
	const attrs = parseAttributes(openTag)

	let width = toNumber(attrs.width)
	let height = toNumber(attrs.height)
	let viewBox = attrs.viewBox

	if (!width || !height) {
		if (!viewBox) throw new Error('missing both width/height and viewBox')
		const parts = viewBox.trim().split(/\s+/).map(Number)
		if (parts.length !== 4 || !parts[2] || !parts[3]) {
			throw new Error(`unparseable viewBox: ${viewBox}`)
		}
		width = parts[2]
		height = parts[3]
	} else if (!viewBox || !toNumber(viewBox.split(/\s+/)[2])) {
		viewBox = `0 0 ${width} ${height}`
	}

	// The `viewBox` is the real coordinate space (and defines the aspect ratio),
	// so record its dimensions rather than the (possibly scaled) width/height.
	const [x, y, viewBoxWidth, viewBoxHeight] = viewBox.trim().split(/\s+/).map(Number)
	return finalize(svg, openTag, viewBox, {
		width: viewBoxWidth,
		height: viewBoxHeight,
		viewBox,
	})
}

function finalize(svg, openTag, viewBox, meta) {
	const kept = openTag
		.replace(/^<svg\b/i, '')
		.replace(/>$/, '')
		.replace(/\s+(width|height)\s*=\s*"[^"]*"/gi, '')
		.replace(/\s+viewBox\s*=\s*"[^"]*"/gi, '')
		.trim()

	let out = svg.replace(openTag, `<svg ${kept} viewBox="${viewBox}">`).trim()
	if (!out.endsWith('\n')) out += '\n'
	return { content: out, meta }
}

function readMetaFromSvg(content) {
	const openTag = /<svg\b[^>]*>/i.exec(content)?.[0] || ''
	const viewBox = parseAttributes(openTag).viewBox || ''
	const [x, y, width, height] = viewBox.trim().split(/\s+/)
	return { width: parseFloat(width), height: parseFloat(height), viewBox }
}

async function request(url, { retries = 5, as = 'text', delay = 800 } = {}) {
	let lastError
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const response = await fetch(url, {
				redirect: 'follow',
				headers: { 'User-Agent': USER_AGENT },
			})
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			if (as === 'json') {
				const text = await response.text()
				try {
					return JSON.parse(text)
				} catch {
					// Commons returns a plain-text "too many requests" body with a 200.
					throw new Error(`non-JSON response: ${text.slice(0, 60)}`)
				}
			}
			return await response.text()
		} catch (error) {
			lastError = error
			if (attempt < retries) await sleep(delay * attempt)
		}
	}
	throw lastError
}

async function fetchLicense(file) {
	try {
		const data = await request(COMMONS_API(file), { as: 'json' })
		const page = data?.query?.pages?.[0]
		const info = page?.imageinfo?.[0]
		if (!info) throw new Error('no imageinfo in API response')
		const em = info.extmetadata || {}
		const categories = em.Categories?.value
		return {
			descriptionUrl: info.descriptionurl,
			originalUrl: info.url,
			license:
				stripHtml(em.LicenseShortName?.value) ||
				deriveLicenseFromCategories(categories) ||
				stripHtml(em.UsageTerms?.value),
			usageTerms: stripHtml(em.UsageTerms?.value),
			licenseUrl: em.LicenseUrl?.value,
			artist: stripHtml(em.Artist?.value),
			credit: stripHtml(em.Credit?.value),
			permission: stripHtml(em.Permission?.value),
			categories,
			attributionRequired: em.AttributionRequired?.value === 'true',
		}
	} catch (error) {
		return { licenseError: String(error.message || error) }
	}
}

async function main() {
	const force = process.argv.includes('--force')
	const manifest = JSON.parse(
		await readFile(path.join(__dirname, 'us-states.json'), 'utf8')
	)

	await mkdir(FLAGS_DIR, { recursive: true })

	const credits = []
	const failures = []

	for (const entry of manifest) {
		const { code, name, file } = entry
		const flagPath = path.join(FLAGS_DIR, `${code}.svg`)
		process.stdout.write(`[${code}] ${name} ... `)
		try {
			let meta
			if (existsSync(flagPath) && !force) {
				meta = readMetaFromSvg(await readFile(flagPath, 'utf8'))
			} else {
				const raw = await request(COMMONS_FILE_PATH(file))
				if (!/<svg[\s>]/i.test(raw)) throw new Error('response is not an SVG')
				const normalized = normalizeSvg(raw)
				await writeFile(flagPath, normalized.content, 'utf8')
				meta = normalized.meta
				await sleep(DOWNLOAD_DELAY)
			}

			const license = await fetchLicense(file)
			credits.push({
				code,
				name,
				file,
				source: `Wikimedia Commons: ${file}`,
				...meta,
				...license,
			})
			const licenseLabel = license.license || `UNKNOWN (${license.licenseError || 'n/a'})`
			console.log(`ok (${meta.width}x${meta.height}, ${licenseLabel})`)
		} catch (error) {
			failures.push({ code, name, file, error: String(error.message || error) })
			console.log(`FAILED: ${error.message || error}`)
		}
		await sleep(API_DELAY)
	}

	credits.sort((a, b) => a.code.localeCompare(b.code))
	await writeFile(
		path.join(FLAGS_DIR, 'credits.json'),
		JSON.stringify(credits, null, 2) + '\n',
		'utf8'
	)

	const unknown = credits.filter((c) => !c.license)
	console.log(`\nDone: ${credits.length} flags, ${failures.length} failed, ${unknown.length} with unknown license.`)
	if (failures.length || unknown.length) {
		for (const failure of failures) {
			console.log(`  FAIL ${failure.code} (${failure.file}): ${failure.error}`)
		}
		for (const item of unknown) {
			console.log(`  UNKNOWN LICENSE ${item.code} (${item.file})`)
		}
		process.exitCode = failures.length ? 1 : 0
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
