import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useUsers } from '@/hooks/useUsers'
import AuthPage from '@/pages/AuthPage'
import AuthenticatedApp from './AuthenticatedApp'
import ErrorBoundary from './ErrorBoundary'

export default function App(): React.ReactElement {
  const location = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Only call the essential hook that determines auth state
  const {
    token,
    user,
    extensions,
    loading: userLoading,
    error: userError,
    register,
    login,
    logout,
    updateExtensions
  } = useUsers()

  // Show auth page if no token
  if (!token) {
    return (
      <AuthPage onLogin={login} onRegister={register} error={userError} loading={userLoading} />
    )
  }

  // Show authenticated app with all hooks
  return (
    <ErrorBoundary>
      <AuthenticatedApp
        token={token}
        user={user}
        extensions={extensions}
        logout={logout}
        updateExtensions={updateExtensions}
      />
    </ErrorBoundary>
  )
}
