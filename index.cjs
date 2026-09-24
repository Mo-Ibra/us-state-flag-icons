'use strict'

const STATES = require('./source/states.json')

function hasState(code) {
	return STATES.some((state) => state.code === code)
}

const states = STATES.map((state) => state.code)

const stateData = STATES

function getStateName(code) {
	const state = STATES.find((state) => state.code === code)
	return state ? state.name : undefined
}

exports.hasState = hasState
exports.states = states
exports.stateData = stateData
exports.getStateName = getStateName
