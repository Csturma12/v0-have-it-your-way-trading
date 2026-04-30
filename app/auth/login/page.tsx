import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  async function login(formData: FormData) {
    'use server'
    
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    const supabase = await createClient()
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
    }
    
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Have It Your Way Trading</h1>
          <p className="text-muted-foreground mt-1">Sign in to access your dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <form action={login} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
              />
            </div>

            {/* Error Message */}
            <ErrorMessage searchParams={searchParams} />

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 transition-all"
            >
              Sign In
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            {"Don't have an account? "}
            <Link href="/auth/sign-up" className="text-green-500 hover:text-green-400 font-medium">
              Request Access
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

async function ErrorMessage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  if (!error) return null
  
  return (
    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
      {error}
    </div>
  )
}
