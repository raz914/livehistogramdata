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

function smoothSeries(values) {
  return values.map((_, index) => {
    const prev = values[index - 1] ?? values[index]
    const curr = values[index]
    const next = values[index + 1] ?? values[index]
    return (prev + curr * 2 + next) / 4
  })
}

function formatAxisValue(value) {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return value.toFixed(2).replace(/\.?0+$/, '')
}

function Histogram({ buckets, showXAxisLabels, trueValue, showTrueValueLine }) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0)

  if (!buckets.length) {
    return <p className="text-sm text-slate-500">No data yet.</p>
  }

  const normalizedValues = buckets.map((bucket) => (total > 0 ? bucket.count / total : 0))
  const smoothed = smoothSeries(normalizedValues)
  const data = buckets.map((bucket, index) => ({
    label: `${formatAxisValue(bucket.start)}-${formatAxisValue(bucket.end)}`,
    midpoint: (bucket.start + bucket.end) / 2,
    barValue: normalizedValues[index],
    lineValue: smoothed[index],
    count: bucket.count,
  }))
  const rangeStart = buckets[0].start
  const rangeEnd = buckets[buckets.length - 1].end

  return (
    <div className="rounded-lg border border-slate-300 bg-slate-200/75 p-3 sm:p-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 30, right: 12, left: 0, bottom: 6 }}>
            <CartesianGrid stroke="#dce2eb" />
            <XAxis
              xAxisId="bucket-axis"
              dataKey="label"
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
                if (name === 'lineValue') {
                  return [Number(value).toFixed(3), 'Smoothed density']
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
            <Line
              xAxisId="bucket-axis"
              type="monotone"
              dataKey="lineValue"
              stroke="#1f77b4"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
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
