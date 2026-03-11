import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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

function Histogram({ buckets }) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0)

  if (!buckets.length) {
    return <p className="text-sm text-slate-500">No data yet.</p>
  }

  const normalizedValues = buckets.map((bucket) => (total > 0 ? bucket.count / total : 0))
  const smoothed = smoothSeries(normalizedValues)
  const data = buckets.map((bucket, index) => ({
    label: `${bucket.start.toFixed(1)}-${bucket.end.toFixed(1)}`,
    barValue: normalizedValues[index],
    lineValue: smoothed[index],
    count: bucket.count,
  }))

  return (
    <div className="rounded-lg border border-slate-300 bg-slate-200/75 p-3 sm:p-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 6 }}>
            <CartesianGrid stroke="#dce2eb" />
            <XAxis dataKey="label" tick={{ fill: '#4b5563', fontSize: 11 }} tickMargin={8} />
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
            <Bar dataKey="barValue" fill="#1f77b4" fillOpacity={0.55} strokeWidth={0} barSize={40} />
            <Line
              type="monotone"
              dataKey="lineValue"
              stroke="#1f77b4"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Histogram
