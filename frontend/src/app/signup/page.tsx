'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Link from 'next/link'
import { createClient } from '../../../utils/supabase/client'
import { Button } from '@/components/ui/button'

export default function SignupPage() {
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [phone, setPhone] = useState('')

    const handleGoogleLogin = async () => {
        setLoading(true);
        const supabase = createClient();
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // Dupa ce Google termina, te trimite AICI:
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            console.error("Google login error:", error);
            setLoading(false);
        }
        // Nota: Daca nu e eroare, utilizatorul pleaca de pe pagina catre Google,
        // deci nu trebuie sa faci setLoading(false) aici.
    };


    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)


        if (!email || !password || !phone) {
            setError('Toate câmpurile sunt obligatorii!')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Parola trebuie să aibă minim 6 caractere.')
            setLoading(false)
            return
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    phone: phone, 
                }
            },
        })


        

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            // SUCCES: Sesiunea este creată automat
            router.refresh()
            // Redirectionam la Home
            router.push('/')
        }
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
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                            <input
                                type="email" 
                                required 
                                placeholder="nume@exemplu.ro"
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                            />
                        </div>

                        {/* TELEFON */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Telefon 
                            </label>
                            <input
                                type="tel" 
                                required 
                                placeholder="07xx xxx xxx"
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value)}
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

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">Sau</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        type="button"
                        className="w-full h-12 font-bold text-slate-700 border-slate-300 hover:bg-slate-50"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        {/* SVG Google Icon */}
                        <svg
                            className="mr-2 h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="24"
                            height="24"
                        >
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Înregistrează-te cu Google
                    </Button>

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