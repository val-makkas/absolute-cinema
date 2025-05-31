import { Routes, Route } from 'react-router-dom'
import AuthForm from '@/components/AuthForm'

interface AuthPageProps {
  onLogin: (email: string, password: string) => Promise<boolean>
  onRegister: (email: string, password: string, displayName: string) => Promise<boolean>
  error: string | null
  loading: boolean
}

export default function AuthPage({
  onLogin,
  onRegister,
  error,
  loading
}: AuthPageProps): React.ReactElement {
  return (
    <Routes>
      <Route
        path="*"
        element={
          <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
              <AuthForm onLogin={onLogin} onRegister={onRegister} error={error} loading={loading} />
            </div>
          </div>
        }
      />
    </Routes>
  )
}
