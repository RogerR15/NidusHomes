'use client';
import Link from 'next/link';
import { User, Menu } from 'lucide-react';
import { useSearchParams } from 'next/navigation';


export default function Navbar() {
    const searchParams = useSearchParams();
    const currentType = searchParams.get('type') || 'SALE';

    const isActive = (type: string) => {
        return currentType === type
            ? "text-blue-600 font-bold border-b-2 border-blue-600"
            : "text-slate-900 font-medium hover:text-blue-600 transition-colors";
    };

    return (
        <header className="w-full bg-white border-b border-gray-100 py-4 px-6 flex items-center justify-between relative z-50">

            {/* STANGA: Navigație Principală (Desktop) */}
            <nav className="hidden md:flex items-center gap-8">
                <Link href="/?type=SALE" className={`py-2 ${isActive('SALE')}`}>
                    Cumpără
                </Link>
                <Link href="/?type=RENT" className={`py-2 ${isActive('RENT')}`}>
                    Închiriază
                </Link>
                <Link href="#" className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors">
                    Vinde
                </Link>
                <Link href="#" className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors">
                    Credite
                </Link>
                <Link href="#" className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors">
                    Agenți
                </Link>
            </nav>

            {/* STANGA: Meniu Hamburger (Mobil) */}
            <div className="md:hidden">
                <button className="p-2 text-slate-600">
                    <Menu size={24} />
                </button>
            </div>

            {/* CENTRU: Logo (Poziționat Absolut pentru a fi perfect centrat) */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Link href="/" className="flex items-center gap-2 group">
                    {/* Un icon simplu de casă pentru logo */}
                    <div className="bg-blue-600 p-1.5 rounded-lg transform group-hover:rotate-12 transition-transform">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="white"
                            className="w-5 h-5"
                        >
                            <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                            <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                        </svg>
                    </div>
                    {/* Aici punem numele (Am pus 'Zidda' ca exemplu, îl poți schimba) */}
                    <span className="text-2xl font-black text-blue-700 tracking-tighter hidden sm:block">
                        NidusHomes
                    </span>
                </Link>
            </div>

            {/* DREAPTA: Meniu Secundar & Profil */}
            <div className="flex items-center gap-6">
                <nav className="hidden md:flex items-center gap-6">
                    <Link href="#" className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors">
                        Administrare
                    </Link>
                    <Link href="#" className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors">
                        Publicitate
                    </Link>
                    <Link href="#" className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors">
                        Ajutor
                    </Link>
                </nav>

                {/* Avatar Utilizator (Cerculețul din dreapta) */}
                <button className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors relative">
                    <span className="font-bold text-xs">IS</span>
                    {/* Bulină de notificare (opțional) */}
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
                        2
                    </span>
                </button>
            </div>
        </header>
    );
}