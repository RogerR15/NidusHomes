'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../utils/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError('Email sau parolă incorectă.')
        } else {
            router.push('/')
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-blue-600 p-8 text-center">
                    <h2 className="text-3xl font-black text-white tracking-tight">NidusHomes</h2>
                    <p className="text-blue-100 mt-2 font-medium">Bine ai revenit!</p>
                </div>

                <div className="p-8 space-y-6">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                            <input
                                type="email" required placeholder="nume@exemplu.ro"
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-bold text-gray-700">Parolă</label>
                                {/* Aici am putea pune link spre Forgot Password */}
                            </div>
                            <input
                                type="password" required placeholder="••••••••"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                            />
                        </div>

                        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">⚠️ {error}</div>}

                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-md transition-all disabled:opacity-50"
                        >
                            {loading ? 'Se verifică...' : 'Intră în Cont'}
                        </button>
                    </form>

                    <div className="text-center pt-2">
                        <p className="text-sm text-gray-500">
                            Nu ai cont încă?{' '}
                            <Link href="/signup" className="text-blue-600 font-bold hover:underline">
                                Înregistrează-te gratuit
                            </Link>
                        </p>
                    </div>

                    <div className="text-center mt-4">
                        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
                            Înapoi la Harta Principală
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}