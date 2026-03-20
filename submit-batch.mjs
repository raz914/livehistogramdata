import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const DEFAULT_API_URL = process.env.API_BASE_URL ?? 'http://localhost:3001'

function printUsage() {
  console.log(`Usage:
  node submit-batch.mjs 4.0 4.1 4.2
  node submit-batch.mjs --values 4.0,4.1,4.2
  node submit-batch.mjs --file test-values.txt

Options:
  --api <url>         API base URL (default: ${DEFAULT_API_URL})
  --values <csv>      Comma-separated list of numeric values
  --file <path>       Text file with one value per line or comma-separated values
  --delay-ms <ms>     Delay between submissions to avoid IP cooldown errors
  --help              Show this help text
`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseNumberList(rawValues) {
  const values = rawValues
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (values.length === 0) {
    throw new Error('No numeric values were provided.')
  }

  return values.map((entry) => {
    const value = Number(entry)
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid number: ${entry}`)
    }

    return value
  })
}

async function loadValuesFromFile(filePath) {
  const content = await readFile(filePath, 'utf8')
  return parseNumberList(content.split(/\r?\n/))
}

function parseArgs(argv) {
  const options = {
    api: DEFAULT_API_URL,
    delayMs: 0,
    values: [],
    file: null,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--api') {
      options.api = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--values') {
      options.values.push(argv[index + 1])
      index += 1
      continue
    }

    if (arg === '--file') {
      options.file = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--delay-ms') {
      options.delayMs = Number(argv[index + 1])
      index += 1
      continue
    }

    options.values.push(arg)
  }

  return options
}

async function submitValue(apiBaseUrl, value) {
  const response = await fetch(`${apiBaseUrl}/api/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value,
      sessionId: randomUUID(),
    }),
  })

  const payload = await response.json().catch(() => ({}))

  return {
    ok: response.ok,
    status: response.status,
    message: payload?.message ?? 'Unknown response from server.',
    stats: payload?.stats ?? null,
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printUsage()
    return
  }

  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
    throw new Error('--delay-ms must be 0 or greater.')
  }

  const values = options.file
    ? await loadValuesFromFile(options.file)
    : parseNumberList(options.values)

  console.log(`Submitting ${values.length} value(s) to ${options.api}`)

  let successCount = 0

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    const result = await submitValue(options.api, value)

    if (result.ok) {
      successCount += 1
      console.log(
        `[${index + 1}/${values.length}] OK ${value} -> total responses: ${result.stats?.total ?? 'n/a'}`,
      )
    } else {
      console.log(`[${index + 1}/${values.length}] FAIL ${value} -> ${result.message}`)
    }

    if (options.delayMs > 0 && index < values.length - 1) {
      await sleep(options.delayMs)
    }
  }

  console.log(`Finished. Successful submissions: ${successCount}/${values.length}`)

  if (successCount < values.length) {
    console.log(
      'If you see rate-limit errors, increase --delay-ms or set IP_COOLDOWN_SECONDS=0 in the server environment for testing.',
    )
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
