// Package-test fixture: a CommonJS consumer.
//
// The core entry point is dual (ESM + CommonJS). The React/string subpackages
// are ES modules only, so on modern Node (>= 22) `require()` may resolve them;
// on older Node it throws. Both outcomes are acceptable, so the test tolerates
// the expected errors rather than failing the build.

const assert = require('node:assert/strict')

const library = require('us-state-flag-icons')

assert.equal(library.hasState('CA'), true)
assert.equal(library.states.length, 56)
assert.equal(library.getStateName('CA'), 'California')

let subpackageRequirable = false
try {
	const CA = require('us-state-flag-icons/react/CA')
	subpackageRequirable = typeof (CA.default || CA) === 'function'
} catch (error) {
	if (error.code !== 'ERR_REQUIRE_ESM' && error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
		throw error
	}
}

console.log(
	'CommonJS consumer: OK' +
		(subpackageRequirable ? ' (subpackages are require()-able on this Node)' : ' (subpackages are ESM-only)')
)
