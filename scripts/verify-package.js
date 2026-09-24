// Production-style package test.
//
// Unit tests run against the repository files. This test runs against the exact
// tarball that `npm publish` would upload: it packs the package, verifies the
// published file list, installs the tarball into a throwaway project, and
// imports it from both ES modules and CommonJS — including a real React render.
//
// This catches packaging mistakes that unit tests cannot see: a missing `files`
// entry (e.g. the runtime dataset), a broken `exports` map, or a runtime
// dependency that only happened to be available inside the repository.
//
// Requires a prior `npm run build`.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync, existsSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURES_DIR = path.join(ROOT, 'scripts', 'package-test')
const CONSUMER_FILES = ['consumer.mjs', 'consumer.cjs', 'consumer.react.mjs']

// Files that must be present in the published tarball.
const REQUIRED_FILES = [
	'package.json',
	'index.js',
	'index.cjs',
	'index.d.ts',
	'source/states.json',
	'source/states.json.js',
	'svg/CA.svg',
	'react/CA.js',
	'string/CA.js',
	'flags.css',
]

// Files/directories that must NOT be published.
const FORBIDDEN_PREFIXES = ['scripts/', 'flags/', 'test/']

const run = (command, args, options = {}) =>
	execFileSync(command, args, { stdio: 'inherit', ...options })

const capture = (command, args, options = {}) =>
	execFileSync(command, args, { encoding: 'utf8', ...options })

function assertBuildExists() {
	if (!existsSync(path.join(ROOT, 'svg')) || !existsSync(path.join(ROOT, 'react', 'index.js'))) {
		throw new Error('Build artifacts are missing. Run `npm run build` first.')
	}
}

function pack() {
	const [result] = JSON.parse(capture('npm', ['pack', '--json'], { cwd: ROOT }))
	const tarball = path.join(ROOT, result.filename)
	const included = result.files.map((file) => file.path)
	const includedSet = new Set(included)

	const missing = REQUIRED_FILES.filter((file) => !includedSet.has(file))
	if (missing.length > 0) {
		throw new Error(`packed tarball is missing: ${missing.join(', ')}`)
	}

	const leaked = included.filter((file) => FORBIDDEN_PREFIXES.some((prefix) => file.startsWith(prefix)))
	if (leaked.length > 0) {
		throw new Error(`packed tarball unexpectedly contains: ${leaked.join(', ')}`)
	}

	console.log(`Packed ${path.basename(tarball)} (${included.length} files).`)
	return tarball
}

function installConsumer(tarball) {
	const directory = mkdtempSync(path.join(os.tmpdir(), 'us-state-flag-icons-consumer-'))
	const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

	writeFileSync(
		path.join(directory, 'package.json'),
		JSON.stringify(
			{
				name: 'us-state-flag-icons-consumer',
				private: true,
				type: 'module',
				dependencies: {
					'us-state-flag-icons': `file:${tarball}`,
					react: pkg.devDependencies.react,
					'react-dom': pkg.devDependencies['react-dom'],
				},
			},
			null,
			2
		)
	)

	for (const file of CONSUMER_FILES) {
		copyFileSync(path.join(FIXTURES_DIR, file), path.join(directory, file))
	}

	run('npm', ['install', '--no-audit', '--no-fund', '--prefer-offline'], { cwd: directory })
	return directory
}

function main() {
	assertBuildExists()

	let tarball
	let directory
	try {
		tarball = pack()
		console.log('Installing the tarball into a fresh consumer project...\n')
		directory = installConsumer(tarball)
		for (const file of CONSUMER_FILES) {
			run('node', [file], { cwd: directory })
		}
		console.log('\nPackage test: OK')
	} finally {
		if (directory) rmSync(directory, { recursive: true, force: true })
		if (tarball && existsSync(tarball)) rmSync(tarball, { force: true })
	}
}

main()
