'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <Card className="w-full max-w-sm border-primary/10">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">🔑</div>
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          {sent
            ? 'Check your inbox for the reset link'
            : "Enter your email and we'll send you a reset link"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail size={24} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              We sent a password reset link to <span className="font-semibold text-foreground">{email}</span>.
              Check your spam folder if you don&apos;t see it.
            </p>
            <Button
              variant="outline"
              className="w-full border-primary/20"
              onClick={() => setSent(false)}
            >
              Resend email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </CardContent>
    </Card>
  )
}
