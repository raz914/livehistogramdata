import { Suspense, lazy, useEffect, useMemo, useState } from 'react'

import StatsCards from './components/StatsCards'
import {
  adminGetConfig,
  adminResetData,
  adminSetConfig,
  createEventStream,
  getStats,
  submitValue,
} from './lib/api'
import { getOrCreateSessionId } from './lib/session'

const Histogram = lazy(() => import('./components/Histogram'))

const MIN_VALUE = 1
const MAX_VALUE = 8
const DEFAULT_BUCKET_SIZE = 0.5
const DEFAULT_ADMIN_CONFIG = {
  allowMultiplePerSession: false,
  bucketSize: DEFAULT_BUCKET_SIZE,
  trueValue: null,
}
const DEFAULT_STATS = {
  total: 0,
  average: null,
  median: null,
  variance: null,
  standardDeviation: null,
  bias: null,
  trueValue: null,
  buckets: [],
  range: {
    min: MIN_VALUE,
    max: MAX_VALUE,
    bucketSize: DEFAULT_BUCKET_SIZE,
  },
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return '--'
  }

  return Number(value).toFixed(2)
}

function isValueInRange(value) {
  return !Number.isNaN(value) && value >= MIN_VALUE && value <= MAX_VALUE
}

function createAdminFormState(config = DEFAULT_ADMIN_CONFIG) {
  return {
    bucketSize: String(config.bucketSize),
    trueValue: config.trueValue === null || config.trueValue === undefined ? '' : String(config.trueValue),
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState(() =>
    window.location.pathname === '/results'
      ? 'results'
      : window.location.pathname === '/admin'
        ? 'admin'
        : 'submit',
  )
  const [inputValue, setInputValue] = useState('')
  const [submitState, setSubmitState] = useState({
    status: 'idle',
    message: '',
  })
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('adminKey') ?? '')
  const [adminState, setAdminState] = useState({
    status: 'idle',
    message: '',
  })
  const [adminConfig, setAdminConfigState] = useState(DEFAULT_ADMIN_CONFIG)
  const [adminForm, setAdminForm] = useState(createAdminFormState(DEFAULT_ADMIN_CONFIG))
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [showXAxisLabels, setShowXAxisLabels] = useState(true)
  const [showStatsDetails, setShowStatsDetails] = useState(true)
  const [showTrueValueLine, setShowTrueValueLine] = useState(true)

  const sessionId = useMemo(() => getOrCreateSessionId(), [])

  const syncAdminConfig = (config) => {
    setAdminConfigState(config)
    setAdminForm(createAdminFormState(config))
  }

  useEffect(() => {
    const onPopState = () => {
      setCurrentPage(
        window.location.pathname === '/results'
          ? 'results'
          : window.location.pathname === '/admin'
            ? 'admin'
            : 'submit',
      )
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
    const path = page === 'results' ? '/results' : page === 'admin' ? '/admin' : '/submit'
    window.history.pushState({}, '', path)
    setCurrentPage(page)
  }

  const loadAdminConfig = async (key) => {
    if (!key) {
      setAdminState({ status: 'error', message: 'Enter the admin key to continue.' })
      return
    }

    setAdminState({ status: 'loading', message: 'Loading admin settings...' })
    const result = await adminGetConfig({ adminKey: key })
    if (!result.ok) {
      setAdminState({ status: 'error', message: result.message })
      return
    }

    syncAdminConfig(result.config)
    setAdminState({ status: 'success', message: 'Admin settings loaded.' })
  }

  useEffect(() => {
    if (currentPage !== 'admin') {
      return
    }

    if (adminKey) {
      loadAdminConfig(adminKey)
    } else {
      setAdminState({ status: 'idle', message: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

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

  const handleSaveAdminSettings = async () => {
    if (!adminKey) {
      setAdminState({ status: 'error', message: 'Enter the admin key to continue.' })
      return
    }

    const parsedBucketSize = Number(adminForm.bucketSize)
    if (
      !Number.isFinite(parsedBucketSize) ||
      parsedBucketSize <= 0 ||
      parsedBucketSize > MAX_VALUE - MIN_VALUE
    ) {
      setAdminState({
        status: 'error',
        message: `Bucket size must be a number greater than 0 and at most ${MAX_VALUE - MIN_VALUE}.`,
      })
      return
    }

    const trimmedTrueValue = adminForm.trueValue.trim()
    const parsedTrueValue = trimmedTrueValue === '' ? null : Number(trimmedTrueValue)
    if (trimmedTrueValue !== '' && !isValueInRange(parsedTrueValue)) {
      setAdminState({
        status: 'error',
        message: `True value must be blank or a number between ${MIN_VALUE} and ${MAX_VALUE}.`,
      })
      return
    }

    setAdminState({ status: 'loading', message: 'Saving admin settings...' })
    const result = await adminSetConfig({
      adminKey,
      updates: {
        bucketSize: parsedBucketSize,
        trueValue: parsedTrueValue,
      },
    })

    if (!result.ok) {
      setAdminState({ status: 'error', message: result.message })
      return
    }

    syncAdminConfig(result.config)
    setAdminState({ status: 'success', message: 'Admin settings saved.' })
  }

  const detailCards = [
    { label: 'Average', value: formatNumber(stats.average) },
    { label: 'Median', value: formatNumber(stats.median) },
    { label: 'Variance', value: formatNumber(stats.variance) },
    { label: 'Standard Deviation', value: formatNumber(stats.standardDeviation) },
    { label: 'Bias', value: formatNumber(stats.bias) },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 text-slate-800">
      <header className="border-b border-slate-300 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-900">Live Numeric Graph</h1>
          <nav className="flex gap-2">
            {currentPage !== 'submit' ? (
              <button
                onClick={() => navigateTo('submit')}
                className="rounded-md bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
              >
                Submit
              </button>
            ) : null}
            {currentPage !== 'results' && currentPage !== 'submit' ? (
              <button
                onClick={() => navigateTo('results')}
                className="rounded-md bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
              >
                Results
              </button>
            ) : null}
            {currentPage !== 'admin' && currentPage !== 'submit' ? (
              <button
                onClick={() => navigateTo('admin')}
                className="rounded-md bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
              >
                Admin
              </button>
            ) : null}
          </nav>
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Live Results</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Updates in real time as participants submit values.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowXAxisLabels((current) => !current)}
                  className="rounded-md bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
                >
                  X-Axis Markings: {showXAxisLabels ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatsDetails((current) => !current)}
                  className="rounded-md bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
                >
                  Statistics: {showStatsDetails ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTrueValueLine((current) => !current)}
                  className="rounded-md bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
                >
                  True Value Line: {showTrueValueLine ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <StatsCards total={stats.total} cards={detailCards} showDetails={showStatsDetails} />
            </div>

            <div className="mt-8">
              <Suspense fallback={<p className="text-sm text-slate-500">Loading chart...</p>}>
                <Histogram
                  buckets={stats.buckets}
                  showXAxisLabels={showXAxisLabels}
                  trueValue={stats.trueValue}
                  showTrueValueLine={showTrueValueLine}
                />
              </Suspense>
            </div>
          </section>
        ) : null}

        {currentPage === 'admin' ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Admin</h2>
            <p className="mt-2 text-sm text-slate-600">
              Use the admin key to manage submissions, bucket size, and the optional true value line.
            </p>

            <div className="mt-6 grid gap-4">
              <label>
                <span className="mb-2 block text-sm text-slate-600">Admin key</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="password"
                    value={adminKey}
                    onChange={(e) => {
                      const next = e.target.value
                      setAdminKey(next)
                      sessionStorage.setItem('adminKey', next)
                    }}
                    className="w-full flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="Enter admin key"
                  />
                  <button
                    type="button"
                    onClick={() => loadAdminConfig(adminKey)}
                    disabled={adminState.status === 'loading'}
                    className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {adminState.status === 'loading' ? 'Loading...' : 'Load'}
                  </button>
                </div>
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid flex-1 gap-4 sm:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-sm text-slate-600">Bucket size</span>
                      <input
                        type="number"
                        min="0.01"
                        max={MAX_VALUE - MIN_VALUE}
                        step="0.1"
                        inputMode="decimal"
                        value={adminForm.bucketSize}
                        onChange={(event) =>
                          setAdminForm((current) => ({
                            ...current,
                            bucketSize: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                        placeholder="0.5"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-sm text-slate-600">True value</span>
                      <input
                        type="number"
                        min={MIN_VALUE}
                        max={MAX_VALUE}
                        step="0.1"
                        inputMode="decimal"
                        value={adminForm.trueValue}
                        onChange={(event) =>
                          setAdminForm((current) => ({
                            ...current,
                            trueValue: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                        placeholder="Leave blank to disable"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveAdminSettings}
                    disabled={adminState.status === 'loading'}
                    className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save settings
                  </button>
                </div>

                <p className="mt-3 text-sm text-slate-600">
                  True value can be left blank. Current allowed range is {MIN_VALUE.toFixed(1)} to{' '}
                  {MAX_VALUE.toFixed(1)}.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">Allow multiple submissions per session</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Temporarily disable the one-response-per-session rule for testing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!adminKey) {
                        setAdminState({ status: 'error', message: 'Enter the admin key to continue.' })
                        return
                      }

                      const nextValue = !adminConfig.allowMultiplePerSession
                      setAdminState({ status: 'loading', message: 'Saving...' })
                      const result = await adminSetConfig({
                        adminKey,
                        updates: {
                          allowMultiplePerSession: nextValue,
                        },
                      })
                      if (!result.ok) {
                        setAdminState({ status: 'error', message: result.message })
                        return
                      }

                      syncAdminConfig(result.config)
                      setAdminState({ status: 'success', message: 'Saved.' })
                    }}
                    disabled={adminState.status === 'loading'}
                    className={`rounded-md px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                      adminConfig.allowMultiplePerSession
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    {adminConfig.allowMultiplePerSession ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  Reset will clear all submissions and broadcast updated results to viewers.
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!adminKey) {
                      setAdminState({ status: 'error', message: 'Enter the admin key to continue.' })
                      return
                    }

                    setAdminState({ status: 'loading', message: 'Resetting data...' })
                    const result = await adminResetData({ adminKey })
                    if (!result.ok) {
                      setAdminState({ status: 'error', message: result.message })
                      return
                    }

                    setStats(result.stats)
                    setAdminState({ status: 'success', message: result.message ?? 'Reset complete.' })
                  }}
                  disabled={adminState.status === 'loading'}
                  className="rounded-md bg-rose-600 px-4 py-2 font-medium text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset data
                </button>
              </div>

              {adminState.message ? (
                <p
                  className={`text-sm ${
                    adminState.status === 'success'
                      ? 'text-emerald-700'
                      : adminState.status === 'error'
                        ? 'text-rose-700'
                        : 'text-slate-600'
                  }`}
                >
                  {adminState.message}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
