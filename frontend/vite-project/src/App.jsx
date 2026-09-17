import { useEffect, useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

function ProtectedRoute({ user, loading, children }) {
  if (loading) return <p className="status">Checking session...</p>
  return user ? children : <Navigate to="/login" replace />
}

function LoginPage({ onLogin, error, loading }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">OAuth lab / 01</p>
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in securely with your Google account.</p>
        {!loading ? <div className="login-area"><GoogleLogin ux_mode="popup" onSuccess={onLogin} onError={() => {}} /><p className="security-note">Your session is stored in an httpOnly cookie.</p></div> : <p className="status">Signing in...</p>}
        {error ? <p className="error" role="alert">{error}</p> : null}
      </section>
      <aside className="info-panel"><span className="mark">G</span><p>Verified identity</p><small>ID token verification happens on the server.</small></aside>
    </main>
  )
}

function Dashboard({ user, onLogout }) {
  const [events, setEvents] = useState([])
  const [calendarToken, setCalendarToken] = useState('')
  const [calendarError, setCalendarError] = useState('')
  const [loadingEvents, setLoadingEvents] = useState(false)

  const requestCalendarAccess = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    onSuccess: async ({ access_token: accessToken }) => {
      setCalendarToken(accessToken)
      setLoadingEvents(true)
      setCalendarError('')
      try {
        const response = await fetch(`${API_URL}/api/calendar/events`, {
          headers: { 'X-Google-Access-Token': accessToken },
          credentials: 'include',
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.details ? `${data.error}: ${data.details}` : data.error ?? 'Calendar request failed')
        setEvents(data.events ?? [])
      } catch (error) {
        setCalendarError(error.message)
      } finally {
        setLoadingEvents(false)
      }
    },
    onError: () => setCalendarError('Calendar permission was not granted'),
  })

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">OAuth lab / dashboard</p>
        <div className="profile-card">
          <img className="avatar" src={user.picture} alt="Profile" />
          <div className="profile-copy"><span className="signed-in">Signed in</span><h2>{user.name}</h2><p>{user.email}</p></div>
          <button className="logout-button" type="button" onClick={onLogout}>Log out</button>
        </div>
        <section className="calendar-panel">
          <div><p className="eyebrow">Calendar</p><h2>Next five events</h2></div>
          <button className="calendar-button" type="button" onClick={() => requestCalendarAccess()}>{loadingEvents ? 'Loading...' : 'Connect Calendar'}</button>
          {!calendarToken && !calendarError ? <p className="security-note">Grant read-only access to view your upcoming events.</p> : null}
          {calendarError ? <p className="error">{calendarError}</p> : null}
          <ol className="event-list">{events.map((event) => <li key={event.id}><strong>{event.summary ?? 'Untitled event'}</strong><span>{event.start?.dateTime ?? event.start?.date ?? 'No start time'}</span></li>)}</ol>
        </section>
      </section>
      <aside className="info-panel"><span className="mark">G</span><p>Private dashboard</p><small>Calendar access is read-only.</small></aside>
    </main>
  )
}

function AppContent() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/auth/me`, { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setError('เชื่อมต่อ Backend ไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [])

  async function handleGoogleSuccess({ credential }) {
    setError('')
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/google`, { method: 'POST', headers: { Authorization: `Bearer ${credential}` }, credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Login failed')
      setUser(data.user)
      navigate('/dashboard')
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null)
    navigate('/login')
  }

  return <Routes><Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleGoogleSuccess} error={error} loading={loading} />} /><Route path="/dashboard" element={<ProtectedRoute user={user} loading={loading}><Dashboard user={user} onLogout={handleLogout} /></ProtectedRoute>} /><Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} /></Routes>
}

function App() {
  return <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}><BrowserRouter><AppContent /></BrowserRouter></GoogleOAuthProvider>
}

export default App
