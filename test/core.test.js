// Core API tests: the dataset shape and the ESM + CommonJS entry points.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import { hasState, states, getStateName, stateData } from 'us-state-flag-icons'

// Resolve the package by name from this file so the test exercises the same
// `exports` map a consumer would hit.
const require = createRequire(import.meta.url)

describe('core API', () => {
	it('exposes the expected set of states', () => {
		assert.equal(states.length, 56)
		assert.ok(states.includes('CA'))
		assert.ok(states.includes('DC'))
		assert.equal(new Set(states).size, states.length)
	})

	it('hasState()', () => {
		assert.equal(hasState('CA'), true)
		assert.equal(hasState('ZZ'), false)
	})

	it('getStateName()', () => {
		assert.equal(getStateName('CA'), 'California')
		assert.equal(getStateName('ZZ'), undefined)
	})

	it('every dataset record is well formed', () => {
		for (const state of stateData) {
			assert.match(state.code, /^[A-Z]{2}$/, `${state.code}: code`)
			assert.ok(state.name.length > 0, `${state.code}: name`)
			assert.ok(state.width > 0 && state.height > 0, `${state.code}: dimensions`)
			assert.match(state.viewBox, /^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/, `${state.code}: viewBox`)
			assert.ok(
				Math.abs(state.aspectRatio - state.width / state.height) < 0.001,
				`${state.code}: aspectRatio`
			)
			assert.ok(state.license, `${state.code}: license`)
		}
	})

	it('is importable from CommonJS', () => {
		const library = require('us-state-flag-icons')
		assert.equal(typeof library.hasState, 'function')
		assert.equal(library.hasState('TX'), true)
		assert.equal(library.states.length, 56)
	})
})
