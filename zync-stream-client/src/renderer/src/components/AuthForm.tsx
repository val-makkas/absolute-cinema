import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import Logo from '@/components/ui/logo'

export default function LoginForm({
  onLogin,
  onRegister,
  error: externalError,
  loading: externalLoading
}: {
  onLogin: (usernameOrEmail: string, password: string) => Promise<boolean>
  onRegister: (username: string, email: string, password: string) => Promise<boolean>
  error?: string | null
  loading?: boolean
}): React.ReactElement {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const animationDuration = 180 // ms

  useEffect(() => {
    if (externalError) setError(externalError)
    setLoading(!!externalLoading)
  }, [externalError, externalLoading])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (!email || !password || (mode === 'register' && !username)) {
      setError('Please fill in all fields.')
      setLoading(false)
      return
    }
    if (mode === 'register') {
      // Call parent register (should accept username, email, password)
      const ok = await onRegister(username, email, password)
      if (ok) {
        // Automatically login after successful registration
        const loginOk = await onLogin(username, password)
        if (!loginOk) setError('Registered but failed to login. Please try manually.')
      } else {
        setError('Registration failed. Please try again.')
      }
    } else {
      // Call parent login (should accept username or email, and password)
      const ok = await onLogin(username || email, password)
      if (!ok) setError('Login failed. Please check your credentials.')
    }
    setLoading(false)
  }

  const handleGoogleLogin = (): void => {
    const url = 'http://localhost:8080/api/users/google/login'
    window.open(url, '_blank', 'noopener')
  }

  // Updated mode toggle handler
  const handleModeToggle = (newMode: 'login' | 'register'): void => {
    if (mode !== newMode) {
      setIsAnimating(true)
      setTimeout(() => {
        setMode(newMode)
        setError('')
        setIsAnimating(false)
      }, animationDuration)
    }
  }

  return (
    <div className={cn('flex flex-col gap-4')}>
      <div className="absolute top-0 right-0">
        <HoverCard>
          <HoverCardTrigger asChild>
            <a href="https://github.com/val-makkas/zync-stream" target="_blank" rel="noreferrer">
              <Button variant="link">@zync-stream</Button>
            </a>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 p-4 overflow-hidden bg-black/80 backdrop-blur-lg border border-white/10 rounded-lg shadow-xl">
            <div className="flex justify-between space-x-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold">Absolute Cinema=Open Source</h4>
                    <p className="text-xs text-white/60">Looking for Contributors</p>
                  </div>
                </div>
                <p className="text-sm text-white/80">
                  Absolute Cinema is a one-person project seeking help to build the future of
                  streaming experiences.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
                  <span className="text-xs text-white/60">Active Development</span>
                </div>
                <a
                  href="https://github.com/val-makkas/zync-stream"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 border-white/20 hover:bg-white/10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                      <path d="M9 18c-4.51 2-5-2-7-2"></path>
                    </svg>
                    Contribute on GitHub
                  </Button>
                </a>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      <div
        className={`relative transition-all duration-500 ease-in-out`}
        style={{
          transform: mode === 'register' ? 'translateY(-0.5px)' : 'translateY(0)'
        }}
      >
        <div className="flex justify-center items-center">
          <div className="relative w-20 h-20">
            <Logo w={20} h={20} abs={false} />
          </div>
        </div>
      </div>

      <div
        className={`relative rounded-lg p-[1px] bg-gradient-animated transition-all duration-500 ease-in-out ${
          isAnimating ? 'opacity-90' : 'opacity-100'
        }`}
      >
        <Card className="bg-background rounded-lg w-full h-full overflow-hidden">
          <CardHeader className="text-center mt-5">
            <div
              className={`transition-all duration-300 ${
                isAnimating
                  ? 'opacity-0 transform translate-y-4'
                  : 'opacity-100 transform translate-y-0'
              }`}
            >
              <CardTitle className="text-xl">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </CardTitle>
              <CardDescription>
                {mode === 'login' ? 'Login to your account' : 'Create a new account'}
              </CardDescription>
            </div>
          </CardHeader>

          {/* Mode toggle buttons */}
          <div className="flex justify-center px-6 pb-4">
            <div className="flex rounded-md overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => handleModeToggle('login')}
                className={`px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  mode === 'login'
                    ? 'bg-primary text-black'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle('register')}
                className={`px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  mode === 'register'
                    ? 'bg-primary text-black'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          <CardContent>
            <form onSubmit={handleSubmit}>
              <div
                className={`grid gap-6 transition-all duration-${animationDuration} ${
                  isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
                }`}
              >
                <div className="flex flex-col gap-4">
                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    variant="outline"
                    className="w-full relative group overflow-hidden"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-purple-600/5 to-blue-600/5 transition-opacity duration-300"></span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="mr-2 h-5 w-5"
                    >
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    <span className="relative z-10">Continue with Google</span>
                  </Button>
                </div>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                  <span className="relative z-10 bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
                <div className="grid gap-6">
                  {mode === 'register' && (
                    <div
                      className="grid gap-2 transition-all duration-300 overflow-hidden"
                      style={{
                        maxHeight: mode === 'register' ? '100px' : '0px',
                        opacity: mode === 'register' ? 1 : 0
                      }}
                    >
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username"
                        required={mode === 'register'}
                      />
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="m@example.com"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      {mode === 'login' && (
                        <a
                          href="#"
                          className="ml-auto text-sm underline-offset-4 hover:underline"
                          onClick={(e) => {
                            e.preventDefault()
                            alert('Password reset is not implemented yet.')
                          }}
                        >
                          Forgot your password?
                        </a>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {error && <div className="text-red-500 text-sm">{error}</div>}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full relative group overflow-hidden"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-purple-600/10 to-blue-600/10 transition-opacity duration-300"></span>
                    <span className="relative z-10">
                      {loading
                        ? mode === 'login'
                          ? 'Signing In...'
                          : 'Registering...'
                        : mode === 'login'
                          ? 'Sign In'
                          : 'Register'}
                    </span>
                  </Button>
                </div>
                <div className="text-center text-sm mb-5">
                  {mode === 'login' ? (
                    <>
                      Don&apos;t have an account?{' '}
                      <a
                        onClick={() => {
                          setMode('register')
                          setError('')
                        }}
                        className="underline underline-offset-4 cursor-pointer"
                      >
                        Sign up
                      </a>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <a
                        onClick={() => {
                          setMode('login')
                          setError('')
                        }}
                        className="underline underline-offset-4 cursor-pointer"
                      >
                        Sign in
                      </a>
                    </>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Animate the Terms of Service text */}
      <div
        className={`text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary transition-all duration-500 ease-in-out`}
        style={{
          opacity: isAnimating ? 0.5 : 1,
          transform: mode === 'register' ? 'translateY(4px)' : 'translateY(0)',
          fontSize: '0.75rem'
        }}
      >
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and{' '}
        <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
