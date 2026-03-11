function StatsCards({ total, average, median }) {
  const cards = [
    { label: 'Total Responses', value: String(total) },
    { label: 'Average', value: average },
    { label: 'Median', value: median },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-800">{card.value}</p>
        </div>
      ))}
    </div>
  )
}

export default StatsCards
