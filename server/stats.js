function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function getBucketIndex(value, minValue, bucketSize, bucketCount) {
  const normalizedOffset = roundTo((value - minValue) / bucketSize, 9)
  const rawIndex = Math.floor(normalizedOffset)

  return Math.min(rawIndex, bucketCount - 1)
}

export function createBuckets(minValue, maxValue, bucketSize) {
  const buckets = []
  const range = maxValue - minValue
  const bucketCount = Math.max(1, Math.ceil(range / bucketSize))

  for (let index = 0; index < bucketCount; index += 1) {
    const start = minValue + index * bucketSize
    const end = Math.min(minValue + (index + 1) * bucketSize, maxValue)
    buckets.push({
      start: roundTo(start, 6),
      end: roundTo(end, 6),
      count: 0,
    })
  }

  return buckets
}

export function buildStats(values, config) {
  const { minValue, maxValue, bucketSize, trueValue = null } = config
  const buckets = createBuckets(minValue, maxValue, bucketSize)

  if (values.length === 0) {
    return {
      total: 0,
      average: null,
      median: null,
      variance: null,
      standardDeviation: null,
      bias: null,
      trueValue,
      buckets,
    }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const total = sorted.length
  const rawAverage = sorted.reduce((sum, n) => sum + n, 0) / total
  const average = roundTo(rawAverage, 3)
  const middle = Math.floor(total / 2)
  const median =
    total % 2 === 0
      ? roundTo((sorted[middle - 1] + sorted[middle]) / 2, 3)
      : roundTo(sorted[middle], 3)
  const rawVariance =
    sorted.reduce((sum, value) => sum + (value - rawAverage) ** 2, 0) / total
  const variance = roundTo(rawVariance, 3)
  const standardDeviation = roundTo(Math.sqrt(rawVariance), 3)
  const bias = trueValue === null ? null : roundTo(rawAverage - trueValue, 3)

  for (const value of values) {
    if (value < minValue || value > maxValue) {
      continue
    }

    const bucketIndex = getBucketIndex(value, minValue, bucketSize, buckets.length)
    buckets[bucketIndex].count += 1
  }

  return {
    total,
    average,
    median,
    variance,
    standardDeviation,
    bias,
    trueValue,
    buckets,
  }
}
