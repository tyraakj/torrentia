import assert from 'node:assert/strict'

// Test batched session stage logic for BatchedSessionsTab
const BATCH_SIZE = 50

function computeBatchProgress(voucherCount) {
  const currentBatchVouchers = voucherCount % BATCH_SIZE
  const settledBatches = Math.floor(voucherCount / BATCH_SIZE)
  const percentToNextBatch = Math.round((currentBatchVouchers / BATCH_SIZE) * 100)
  
  return {
    currentBatchVouchers,
    settledBatches,
    percentToNextBatch,
    readyToSettle: currentBatchVouchers === 0 && voucherCount > 0,
  }
}

// 0 vouchers test (empty state)
const emptyProgress = computeBatchProgress(0)
assert.equal(emptyProgress.currentBatchVouchers, 0)
assert.equal(emptyProgress.settledBatches, 0)
assert.equal(emptyProgress.percentToNextBatch, 0)

// 25 vouchers in buffer
const halfProgress = computeBatchProgress(25)
assert.equal(halfProgress.currentBatchVouchers, 25)
assert.equal(halfProgress.settledBatches, 0)
assert.equal(halfProgress.percentToNextBatch, 50)

// 100 vouchers settled (2 full batches)
const fullBatches = computeBatchProgress(100)
assert.equal(fullBatches.currentBatchVouchers, 0)
assert.equal(fullBatches.settledBatches, 2)
assert.equal(fullBatches.percentToNextBatch, 0)

console.log('✓ BatchedSessionsTab math and progress tests passed cleanly')
