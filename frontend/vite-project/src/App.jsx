import { useEffect, useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

function formatEventDate(event) {
  if (event.start?.date) return dateFormatter.format(new Date(`${event.start.date}T00:00:00`))
  return event.start?.dateTime ? dateFormatter.format(new Date(event.start.dateTime)) : 'No date'
}

function formatEventTime(event) {
  if (event.start?.date) return 'All day'
  return event.start?.dateTime ? timeFormatter.format(new Date(event.start.dateTime)) : 'No time'
}

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

function ProfileAvatar({ user }) {
  const [imageFailed, setImageFailed] = useState(false)
  const initials = user.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'G'

  if (!user.picture || imageFailed) return <span className="avatar avatar-fallback" aria-label={`${user.name} profile`}>{initials}</span>
  return <img className="avatar" src={user.picture} alt={`${user.name} profile`} onError={() => setImageFailed(true)} />
}

function Dashboard({ user, onLogout }) {
  const [events, setEvents] = useState([])
  const [calendarToken, setCalendarToken] = useState('')
  const [calendarError, setCalendarError] = useState('')
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState('this month')

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
        setCalendarMonth(data.month ?? 'this month')
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
          <ProfileAvatar user={user} />
          <div className="profile-copy"><span className="signed-in">Signed in</span><h2>{user.name}</h2><p>{user.email}</p></div>
          <button className="logout-button" type="button" onClick={onLogout}>Log out</button>
        </div>
        <section className="calendar-panel">
          <div className="calendar-heading"><div><p className="eyebrow">Google Calendar</p><h2>{calendarMonth}</h2></div><span className="event-count">{events.length} events</span></div>
          <button className="calendar-button" type="button" onClick={() => requestCalendarAccess()}>{loadingEvents ? 'Loading...' : 'Connect Calendar'}</button>
          {!calendarToken && !calendarError ? <p className="security-note">Grant read-only access to view your upcoming events.</p> : null}
          {calendarError ? <p className="error">{calendarError}</p> : null}
          {events.length ? <div className="table-wrap"><table className="event-table"><thead><tr><th>Event</th><th>Date</th><th>Time</th><th>Calendar</th><th>Location</th><th>Status</th></tr></thead><tbody>{events.map((event) => <tr key={`${event.calendarId}-${event.id}`}><td>{event.htmlLink ? <a href={event.htmlLink} target="_blank" rel="noreferrer">{event.summary ?? 'Untitled event'}</a> : event.summary ?? 'Untitled event'}</td><td>{formatEventDate(event)}</td><td>{formatEventTime(event)}</td><td>{event.isHoliday ? <span className="holiday-label">Holiday</span> : event.calendarName ?? 'Primary calendar'}</td><td>{event.location ?? '—'}</td><td><span className={`event-status ${event.status ?? 'confirmed'}`}>{event.status ?? 'confirmed'}</span></td></tr>)}</tbody></table></div> : <p className="empty-state">No events found for {calendarMonth}.</p>}
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
