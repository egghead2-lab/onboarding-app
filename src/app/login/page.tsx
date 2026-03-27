import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import HashError from './HashError'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    redirect(profile?.role === 'candidate' ? '/portal' : '/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="Professor Egghead Science Academy" width={200} height={84} />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1 text-center">Onboarding Portal</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">Sign in to continue</p>
        <HashError />
        <form action="/auth/login" method="POST" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 autofill:bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 autofill:bg-white"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </form>
        <a href="/forgot-password" className="block text-center text-sm text-gray-500 hover:underline mt-4">
          Forgot password?
        </a>
      </div>
    </div>
  )
}
