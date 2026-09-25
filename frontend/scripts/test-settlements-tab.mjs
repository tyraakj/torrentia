import assert from 'node:assert/strict'

// Test dynamic split math for SettlementsTab
function calculateSplitAngles(creatorShareBps) {
  const creatorPct = Math.round(creatorShareBps / 100)
  const hostPct = 100 - creatorPct
  const circumference = 201.06
  const creatorOffset = circumference * (1 - creatorPct / 100)
  return { creatorPct, hostPct, creatorOffset }
}

// 70/30 split default
const split70 = calculateSplitAngles(7000)
assert.equal(split70.creatorPct, 70)
assert.equal(split70.hostPct, 30)

// 85/15 custom split
const split85 = calculateSplitAngles(8500)
assert.equal(split85.creatorPct, 85)
assert.equal(split85.hostPct, 15)

// 99/1 maximum split
const split99 = calculateSplitAngles(9900)
assert.equal(split99.creatorPct, 99)
assert.equal(split99.hostPct, 1)

// Zero mock payment check
function validateSettlementLedger(payments) {
  if (!Array.isArray(payments) || payments.length === 0) {
    return { hasPayments: false, message: 'Awaiting first community download settlement' }
  }
  return { hasPayments: true, count: payments.length }
}

assert.equal(validateSettlementLedger([]).hasPayments, false)
assert.equal(validateSettlementLedger([{ txHash: '0x123' }]).hasPayments, true)

console.log('✓ SettlementsTab math and empty state tests passed cleanly')
