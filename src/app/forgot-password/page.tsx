import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function sendReset(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const email = formData.get('email') as string

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  })

  redirect('/forgot-password?sent=1')
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>

        {params.sent ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              If that email exists, you'll receive a reset link shortly.
            </p>
            <a href="/login" className="text-sm text-blue-600 hover:underline">Back to login</a>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
            <form action={sendReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Send Reset Link
              </button>
            </form>
            <a href="/login" className="block text-center text-sm text-gray-500 hover:underline mt-4">Back to login</a>
          </>
        )}
      </div>
    </div>
  )
}
