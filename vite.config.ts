import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Serve the /api functions from the dev server too, so the leaderboard works locally.
 * In production the host (e.g. Vercel) runs api/*.ts itself with REDIS_URL from its settings.
 */
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      const proc = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process
      if (env.REDIS_URL) proc.env.REDIS_URL = env.REDIS_URL
      for (const name of ['leaderboard', 'messages']) {
        server.middlewares.use(`/api/${name}`, async (req, res) => {
          // a broken or failing function answers with an error; it must never take the dev server down
          try {
            const mod = await server.ssrLoadModule(`/api/${name}.ts`)
            // connect strips the mount path; the function expects the full URL like on the host
            const r = req as unknown as { url?: string; originalUrl?: string }
            r.url = r.originalUrl ?? r.url
            await mod.default(req, res)
          } catch (e) {
            server.config.logger.error(`[api] ${e instanceof Error ? e.message : String(e)}`)
            if (!res.headersSent) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
            }
            res.end(JSON.stringify({ error: `${name} unavailable` }))
          }
        })
      }
    },
  }
}

/**
 * What build this is, shown at the bottom of Settings: the package version, the commit and when
 * it was built. On Vercel the commit comes from its own variable; locally it asks git, and if
 * there's no git it simply says "dev". (Node modules are loaded by name so the config still
 * type-checks without Node's types installed.)
 */
async function buildInfo() {
  const proc = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process
  const load = (name: string) => import(/* @vite-ignore */ name)
  let version = '0.0.0'
  try {
    const fs = await load('node:fs')
    version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version ?? version
  } catch {
    /* keep the fallback */
  }
  let sha = proc.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? ''
  if (!sha) {
    try {
      const cp = await load('node:child_process')
      sha = String(cp.execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })).trim()
    } catch {
      sha = 'dev'
    }
  }
  return { version, sha, date: new Date().toISOString() }
}

export default defineConfig(async ({ mode, command }) => {
  // '' = load every variable from .env files, not just VITE_ ones; they stay server-side here
  const env = loadEnv(mode, '.', '')
  const build = await buildInfo()
  return {
    plugins: [react(), devApi(env)],
    server: { port: 5173 },
    define: {
      __BUILD__: JSON.stringify({ ...build, dev: command === 'serve' }),
    },
  }
})
