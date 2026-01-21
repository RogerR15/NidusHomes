'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Link from 'next/link'
import { createClient } from '../../../utils/supabase/client'

export default function SignupPage() {
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
            },
        })

        if (error) {
            setError(error.message)
        } else {
            setMessage('Cont creat cu succes! Verifică-ți email-ul pentru a confirma.')
            setEmail('')
            setPassword('')
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-blue-600 p-8 text-center">
                    <h2 className="text-3xl font-black text-white tracking-tight">NidusHomes</h2>
                    <p className="text-blue-100 mt-2 font-medium">Creează un cont nou</p>
                </div>

                <div className="p-8 space-y-6">
                    <form onSubmit={handleSignUp} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                            <input
                                type="email" required placeholder="nume@exemplu.ro"
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Parolă</label>
                            <input
                                type="password" required placeholder="Minim 6 caractere"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                            />
                        </div>

                        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">⚠️ {error}</div>}
                        {message && <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg border border-green-100">✅ {message}</div>}

                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-md transition-all disabled:opacity-50"
                        >
                            {loading ? 'Se creează contul...' : 'Înregistrare Gratuită'}
                        </button>
                    </form>

                    <div className="text-center pt-2">
                        <p className="text-sm text-gray-500">
                            Ai deja un cont?{' '}
                            <Link href="/login" className="text-blue-600 font-bold hover:underline">
                                Autentifică-te aici
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