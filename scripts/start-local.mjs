// ローカル開発を一括起動: Firestoreエミュレーター → サンプルデータ投入 → Vite
import { spawn } from 'node:child_process'
import net from 'node:net'

const run = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', shell: true })

const waitPort = (port, timeoutMs = 120_000) =>
  new Promise((resolve, reject) => {
    const started = Date.now()
    const tryOnce = () => {
      const s = net.connect(port, '127.0.0.1')
      s.once('connect', () => {
        s.destroy()
        resolve()
      })
      s.once('error', () => {
        s.destroy()
        if (Date.now() - started > timeoutMs) reject(new Error(`ポート ${port} が起動しませんでした`))
        else setTimeout(tryOnce, 500)
      })
    }
    tryOnce()
  })

const emulator = run('npm', ['run', 'emulators'])
let vite
const shutdown = () => {
  for (const p of [vite, emulator]) if (p && !p.killed) spawn('taskkill', ['/pid', String(p.pid), '/t', '/f'], { shell: true })
}
process.on('SIGINT', () => {
  shutdown()
  process.exit(0)
})
emulator.on('exit', () => process.exit(1))

await waitPort(8080)
await waitPort(9199)
await new Promise((resolve) => run('npm', ['run', 'seed']).on('exit', resolve))
vite = run('npm', ['run', 'dev'])
