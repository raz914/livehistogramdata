import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function getGaussianKernel(value) {
  return Math.exp(-(value ** 2) / 2) / Math.sqrt(2 * Math.PI)
}

function getGaussianProbabilityMass(midpoint, mean, standardDeviation, bucketWidth) {
  const exponent = -((midpoint - mean) ** 2) / (2 * standardDeviation ** 2)
  const pdf =
    Math.exp(exponent) / (standardDeviation * Math.sqrt(2 * Math.PI))

  return pdf * bucketWidth
}

function getKdeBandwidth(standardDeviation, total, bucketWidth) {
  if (!Number.isFinite(standardDeviation) || standardDeviation <= 0 || total <= 1) {
    return null
  }

  const silvermanBandwidth = 1.06 * standardDeviation * total ** (-1 / 5)

  return Math.max(silvermanBandwidth, bucketWidth * 0.6)
}

function getKdeProbabilityMass(midpoint, buckets, bandwidth, total, bucketWidth) {
  if (!Number.isFinite(bandwidth) || bandwidth <= 0 || total <= 0) {
    return null
  }

  let density = 0

  for (const bucket of buckets) {
    if (bucket.count <= 0) {
      continue
    }

    const bucketMidpoint = (bucket.start + bucket.end) / 2
    density += bucket.count * getGaussianKernel((midpoint - bucketMidpoint) / bandwidth)
  }

  return (density / (total * bandwidth)) * bucketWidth
}

function formatAxisValue(value) {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return value.toFixed(2).replace(/\.?0+$/, '')
}

function getAxisPrecision(bucketWidth) {
  if (!Number.isFinite(bucketWidth) || bucketWidth <= 0) {
    return 1
  }

  const normalizedWidth = bucketWidth.toFixed(6).replace(/0+$/, '')
  const decimalPart = normalizedWidth.split('.')[1]

  return Math.max(1, decimalPart ? decimalPart.length : 0)
}

function formatTickValue(value, bucketWidth) {
  return Number(value).toFixed(getAxisPrecision(bucketWidth))
}

function Histogram({
  buckets,
  showXAxisLabels,
  trueValue,
  showTrueValueLine,
  curveMode,
  average,
  standardDeviation,
}) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0)

  if (!buckets.length) {
    return <p className="text-sm text-slate-500">No data yet.</p>
  }

  const bucketWidth = buckets[0].end - buckets[0].start
  const canRenderCurve =
    curveMode !== 'off' &&
    total > 1 &&
    Number.isFinite(average) &&
    Number.isFinite(standardDeviation) &&
    standardDeviation > 0 &&
    bucketWidth > 0
  const kdeBandwidth = canRenderCurve
    ? getKdeBandwidth(standardDeviation, total, bucketWidth)
    : null
  const normalizedValues = buckets.map((bucket) => (total > 0 ? bucket.count / total : 0))
  const data = buckets.map((bucket, index) => ({
    label: `${formatAxisValue(bucket.start)}-${formatAxisValue(bucket.end)}`,
    tickLabel: formatTickValue(bucket.start, bucketWidth),
    midpoint: (bucket.start + bucket.end) / 2,
    barValue: normalizedValues[index],
    curveValue: canRenderCurve
      ? curveMode === 'kde'
        ? getKdeProbabilityMass(
            (bucket.start + bucket.end) / 2,
            buckets,
            kdeBandwidth,
            total,
            bucketWidth,
          )
        : getGaussianProbabilityMass(
            (bucket.start + bucket.end) / 2,
            average,
            standardDeviation,
            bucketWidth,
          )
      : null,
    count: bucket.count,
  }))
  const rangeStart = buckets[0].start
  const rangeEnd = buckets[buckets.length - 1].end
  const curveLabel = curveMode === 'kde' ? 'KDE fit' : 'Gaussian fit'

  return (
    <div className="rounded-lg border border-slate-300 bg-slate-200/75 p-3 sm:p-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 30, right: 12, left: 0, bottom: 6 }}>
            <CartesianGrid stroke="#dce2eb" />
            <XAxis
              xAxisId="bucket-axis"
              dataKey="tickLabel"
              tick={showXAxisLabels ? { fill: '#4b5563', fontSize: 11 } : false}
              tickLine={showXAxisLabels}
              axisLine={showXAxisLabels}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={16}
              hide={!showXAxisLabels}
            />
            <XAxis
              xAxisId="value-axis"
              type="number"
              dataKey="midpoint"
              domain={[rangeStart, rangeEnd]}
              hide
            />
            <YAxis
              tick={{ fill: '#4b5563', fontSize: 11 }}
              domain={[0, 'auto']}
              tickFormatter={(value) => Number(value).toFixed(1)}
            />
            <Tooltip
              formatter={(value, name, payload) => {
                if (name === 'curveValue') {
                  return [Number(value).toFixed(3), curveLabel]
                }

                return [payload.payload.count, 'Responses']
              }}
              labelFormatter={(label) => `Range ${label}`}
            />
            <Bar
              xAxisId="bucket-axis"
              dataKey="barValue"
              fill="#1f77b4"
              fillOpacity={0.55}
              strokeWidth={0}
              maxBarSize={40}
            />
            {canRenderCurve ? (
              <Line
                xAxisId="bucket-axis"
                type="monotone"
                dataKey="curveValue"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 4 }}
              />
            ) : null}
            {showTrueValueLine && trueValue !== null ? (
              <ReferenceLine
                xAxisId="value-axis"
                x={trueValue}
                stroke="#dc2626"
                strokeWidth={2}
                ifOverflow="extendDomain"
                label={{
                  value: 'True value',
                  position: 'top',
                  offset: 12,
                  fill: '#dc2626',
                  fontSize: 12,
                }}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Histogram
