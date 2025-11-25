import { useEffect, useState } from 'react'
import './App.css'

const PING_ENDPOINT = import.meta.env.VITE_PING_ENDPOINT
const WAKE_ENDPOINT = import.meta.env.VITE_WAKE_ENDPOINT
const WAKE_SECRET = import.meta.env.VITE_WAKE_SECRET

type ServerState = 'unknown' | 'online' | 'offline' | 'wake-sent'

function App() {
  const [state, setState] = useState<ServerState>('unknown')

  const ping = async () => {
    try {
      const res = await fetch(PING_ENDPOINT, { method: 'GET' })
      if (!res.ok) throw new Error('ping failed')
      setState('online')
    } catch (e) {
      setState(prev => (prev === 'wake-sent' ? 'wake-sent' : 'offline'))
    } finally {
    }
  }

  const sendWake = async () => {
    try {
      setState('wake-sent')

      const wakePromise = fetch(WAKE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ secret: WAKE_SECRET })
      });

      const fiveMinutes = 5 * 60 * 1000
      let timeoutId: number | undefined = undefined

      const waitForPing = () =>
        new Promise<void>((resolve) => {
          const interval = 3000 // poll every 3s
          const id = setInterval(async () => {
            try {
              const res = await fetch(PING_ENDPOINT, { method: 'GET' })
              if (res.ok) {
                clearInterval(id)
                if (timeoutId) clearTimeout(timeoutId)
                resolve()
              }
            } catch {
            }
          }, interval)

          timeoutId = window.setTimeout(() => {
            clearInterval(id)
            resolve()
          }, fiveMinutes)
        })

      wakePromise.catch(() => {
      })

      await waitForPing()

      try {
        const final = await fetch(PING_ENDPOINT, { method: 'GET' })
        if (final.ok) {
          setState('online')
        } else {
          setState('offline')
        }
      } catch {
        setState('offline')
      }
    } catch {
      setState('offline')
    }
  }

  useEffect(() => {
    ping()
    const id = setInterval(ping, 5000)
    return () => clearInterval(id)
  }, [])

  // UI
  return (
    <div className="min-h-screen flex items-center justify-center">
      {state === 'online' && (
        <div className="w-full h-full fixed top-0 left-0 bg-green-600 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-5xl font-semibold">Server is on</h1>
          </div>
        </div>
      )}

      {state === 'offline' && (
        <div className="w-full h-full fixed top-0 left-0 bg-red-600 flex items-center justify-center">
          <div className="text-center">
            <button
              onClick={sendWake}
              className="bg-white text-red-600 px-20 py-10 text-5xl font-semibold shadow-lg"
            >
              Wake
            </button>
          </div>
        </div>
      )}

      {state === 'wake-sent' && (
        <div className="w-full h-full fixed top-0 left-0 bg-red-600 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-3xl font-semibold">Wake request sent</h1>
          </div>
        </div>
      )}

      {state === 'unknown' && (
        <div className="w-full h-full fixed top-0 left-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-5xl font-medium">Checking server status...</h1>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
