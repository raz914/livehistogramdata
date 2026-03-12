import { Suspense, lazy, useEffect, useMemo, useState } from 'react'

import StatsCards from './components/StatsCards'
import { createEventStream, getStats, submitValue } from './lib/api'
import { getOrCreateSessionId } from './lib/session'

const Histogram = lazy(() => import('./components/Histogram'))

const MIN_VALUE = 1
const MAX_VALUE = 8

function formatNumber(value) {
  if (value === null || value === undefined) {
    return '--'
  }

  return Number(value).toFixed(2)
}

function isValueInRange(value) {
  return !Number.isNaN(value) && value >= MIN_VALUE && value <= MAX_VALUE
}

function App() {
  const [currentPage, setCurrentPage] = useState(() =>
    window.location.pathname === '/results' ? 'results' : 'submit',
  )
  const [inputValue, setInputValue] = useState('')
  const [submitState, setSubmitState] = useState({
    status: 'idle',
    message: '',
  })
  const [stats, setStats] = useState({
    total: 0,
    average: null,
    median: null,
    buckets: [],
  })

  const sessionId = useMemo(() => getOrCreateSessionId(), [])

  useEffect(() => {
    const onPopState = () => {
      setCurrentPage(window.location.pathname === '/results' ? 'results' : 'submit')
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    let closed = false

    async function loadInitialStats() {
      try {
        const payload = await getStats()
        if (!closed) {
          setStats(payload)
        }
      } catch {
        if (!closed) {
          setSubmitState({
            status: 'error',
            message: 'Unable to reach server. Start the API server and try again.',
          })
        }
      }
    }

    loadInitialStats()

    const stream = createEventStream((payload) => {
      setStats(payload)
    })

    return () => {
      closed = true
      stream.close()
    }
  }, [])

  const navigateTo = (page) => {
    const path = page === 'results' ? '/results' : '/submit'
    window.history.pushState({}, '', path)
    setCurrentPage(page)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const parsedValue = Number(inputValue)
    if (!isValueInRange(parsedValue)) {
      setSubmitState({
        status: 'error',
        message: `Please enter a number between ${MIN_VALUE} and ${MAX_VALUE}.`,
      })
      return
    }

    setSubmitState({
      status: 'loading',
      message: 'Submitting your response...',
    })

    const result = await submitValue({ value: parsedValue, sessionId })
    if (result.ok) {
      setInputValue('')
      setStats(result.stats)
      setSubmitState({
        status: 'success',
        message: 'Response submitted. Thank you.',
      })
      return
    }

    setSubmitState({
      status: 'error',
      message: result.message,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 text-slate-800">
      <header className="border-b border-slate-300 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-900">Live Numeric Graph</h1>
          {currentPage === 'results' ? (
            <nav className="flex gap-2">
              <button
                onClick={() => navigateTo('submit')}
                className="rounded-md bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
              >
                Submit
              </button>
            </nav>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        {currentPage === 'submit' ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Submit Your Number</h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter a value from {MIN_VALUE.toFixed(1)} to {MAX_VALUE.toFixed(1)}. One response is
              allowed per browser session.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="flex-1">
                <span className="mb-2 block text-sm text-slate-600">Value</span>
                <input
                  type="number"
                  min={MIN_VALUE}
                  max={MAX_VALUE}
                  step="0.1"
                  inputMode="decimal"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="e.g. 4.7"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={submitState.status === 'loading'}
                className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitState.status === 'loading' ? 'Submitting...' : 'Submit'}
              </button>
            </form>

            {submitState.message ? (
              <p
                className={`mt-4 text-sm ${
                  submitState.status === 'success' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {submitState.message}
              </p>
            ) : null}
          </section>
        ) : null}

        {currentPage === 'results' ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Live Results</h2>
            <p className="mt-2 text-sm text-slate-600">
              Updates in real time as participants submit values.
            </p>

            <div className="mt-6">
              <StatsCards
                total={stats.total}
                average={formatNumber(stats.average)}
                median={formatNumber(stats.median)}
              />
            </div>

            <div className="mt-8">
              <Suspense fallback={<p className="text-sm text-slate-500">Loading chart...</p>}>
                <Histogram buckets={stats.buckets} />
              </Suspense>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
