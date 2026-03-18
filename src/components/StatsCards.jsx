function StatsCards({ total, cards, showDetails }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow">
        <p className="text-xs uppercase tracking-wide text-slate-500">Total Responses</p>
        <p className="mt-2 text-3xl font-semibold text-slate-800">{String(total)}</p>
      </div>

      {showDetails ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
      ) : null}
    </div>
  )
}

export default StatsCards
