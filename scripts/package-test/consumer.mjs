// Package-test fixture: a plain ES module consumer.
// Run against the packed tarball installed by scripts/verify-package.js.

import assert from 'node:assert/strict'

import { hasState, states, getStateName } from 'us-state-flag-icons'
import { CA, TX } from 'us-state-flag-icons/react'
import OH from 'us-state-flag-icons/react/OH'
import caString from 'us-state-flag-icons/string/CA'

assert.equal(states.length, 56)
assert.equal(hasState('CA'), true)
assert.equal(hasState('ZZ'), false)
assert.equal(getStateName('CA'), 'California')

assert.equal(typeof CA, 'function')
assert.equal(typeof TX, 'function')
assert.equal(typeof OH, 'function')
assert.ok(caString.startsWith('<svg'))

console.log('ESM consumer: OK')
