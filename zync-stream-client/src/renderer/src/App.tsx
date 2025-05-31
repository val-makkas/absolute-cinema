import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useUsers } from '@/hooks/useUsers'
import AuthPage from '@/pages/AuthPage'
import AuthenticatedApp from './AuthenticatedApp'
import ErrorBoundary from './ErrorBoundary'

export default function App(): React.ReactElement {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

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

  if (!token) {
    return (
      <AuthPage onLogin={login} onRegister={register} error={userError} loading={userLoading} />
    )
  }

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
