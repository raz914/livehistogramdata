function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function createBuckets(minValue, maxValue, bucketSize) {
  const buckets = []

  for (let start = minValue; start < maxValue; start += bucketSize) {
    const end = Math.min(start + bucketSize, maxValue)
    buckets.push({
      start: roundTo(start),
      end: roundTo(end),
      count: 0,
    })
  }

  return buckets
}

export function buildStats(values, config) {
  const { minValue, maxValue, bucketSize } = config
  const buckets = createBuckets(minValue, maxValue, bucketSize)

  if (values.length === 0) {
    return {
      total: 0,
      average: null,
      median: null,
      buckets,
    }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const total = sorted.length
  const average = roundTo(sorted.reduce((sum, n) => sum + n, 0) / total, 3)
  const middle = Math.floor(total / 2)
  const median =
    total % 2 === 0
      ? roundTo((sorted[middle - 1] + sorted[middle]) / 2, 3)
      : sorted[middle]

  for (const value of values) {
    if (value < minValue || value > maxValue) {
      continue
    }

    const rawIndex = Math.floor((value - minValue) / bucketSize)
    const clampedIndex = Math.min(rawIndex, buckets.length - 1)
    buckets[clampedIndex].count += 1
  }

  return {
    total,
    average,
    median,
    buckets,
  }
}
