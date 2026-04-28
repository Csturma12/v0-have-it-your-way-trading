import Link from 'next/link'
import { CheckCircle, Mail } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
        <p className="text-muted-foreground mb-6">
          We&apos;ve sent a confirmation link to your email address. Please click the link to verify your account and complete registration.
        </p>
        
        <div className="p-4 rounded-lg bg-muted/50 border border-border mb-6">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>Confirmation email sent</span>
          </div>
        </div>

        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Back to Login
        </Link>

        <p className="text-xs text-muted-foreground mt-6">
          Didn&apos;t receive the email? Check your spam folder or contact support.
        </p>
      </div>
    </div>
  )
}
