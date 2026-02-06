'use client';
import Link from 'next/link';
import {
    Menu,
    LogOut,
    Heart,
    Settings,
    User,
    ChevronDown,
    LayoutDashboard,
    Layout,
    LayoutList,
    MessageCircle,
    Briefcase,
    PlusCircle, // Iconiță nouă pentru "Devino Agent"
    X,
    Search
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios'; // <--- IMPORT AXIOS

// SHADCN IMPORTS
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { createClient } from '../../utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { createPortal } from 'react-dom';
import { Input } from "@/components/ui/input";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose // Importam asta pentru a putea inchide meniul
} from "@/components/ui/sheet"


export default function Navbar() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentType = searchParams.get('type') || 'SALE';
    const supabase = createClient();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

    const { user, isAgent, loading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setSearchQuery(searchParams.get('q') || '');
    }, [searchParams]);

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const params = new URLSearchParams(searchParams.toString());
            if (searchQuery.trim()) {
                params.set('q', searchQuery);
            } else {
                params.delete('q');
            }
            router.push(`/?${params.toString()}`);
            
            // Optional: Inchidem tastatura pe mobil (blur)
            (e.target as HTMLInputElement).blur();
        }
    }

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [mobileMenuOpen]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login'; 
    };

    const isActive = (type: string) => {
        return currentType === type
            ? "text-blue-600 font-bold border-b-2 border-blue-600"
            : "text-slate-600 font-medium hover:text-blue-600 transition-colors";
    };

    const getInitials = () => {
        const name = user?.user_metadata?.full_name || user?.email || 'U';
        return name.slice(0, 1).toUpperCase();
    }



    return (
        
            <header className="sticky top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 py-3 px-4 md:px-8 flex items-center justify-between z-50 transition-all">

            {/* STANGA */}
            <nav className="hidden md:flex items-center gap-8">
                <Link href="/?type=SALE" className={`py-2 text-sm ${isActive('SALE')}`}>Cumpara</Link>
                <Link href="/?type=RENT" className={`py-2 text-sm ${isActive('RENT')}`}>Închiriaza</Link>
                <Link href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Vinde</Link>
            </nav>

            {/* MOBIL */}
            
                <div className="md:hidden">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    {/* TRIGGER (BUTONUL HAMBURGER) */}
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-700">
                            <Menu size={24} />
                        </Button>
                    </SheetTrigger>

                    {/* CONTENT (SIDEBAR-UL) - side="left" il face sa vina din stanga */}
                    {/* IMPORTANT: className="z-[9999]" suprascrie default-ul Shadcn (z-50) ca sa fim peste butonul de harta */}
                    <SheetContent side="left" className="z-9999 w-70 p-0 bg-white">
                        
                        {/* Header Sidebar */}
                        <SheetHeader className="p-4 border-b border-gray-100 text-left">
                            <SheetTitle className="text-xl font-black text-slate-900 flex items-center gap-1">
                                Nidus<span className="text-blue-700">Homes</span>
                            </SheetTitle>
                        </SheetHeader>

                        {/* Linkuri Navigare */}
                        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Imobiliare</p>
                            
                            {/* Folosim onClick={() => setIsOpen(false)} ca sa inchidem meniul dupa click */}
                            <Link 
                                href="/?type=SALE" 
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentType === 'SALE' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-gray-50'}`}
                            >
                                Cumpara
                            </Link>

                            <Link 
                                href="/?type=RENT" 
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentType === 'RENT' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-gray-50'}`}
                            >
                                Închiriaza
                            </Link>

                            <Link 
                                href="#" 
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-gray-50 font-medium"
                            >
                                Vinde proprietate
                            </Link>

                            <div className="my-4 border-t border-gray-100"></div>

                            {!user && (
                                <div className="space-y-3 mt-4">
                                     <Link href="/login" onClick={() => setIsOpen(false)}>
                                        <Button variant="outline" className="w-full justify-start h-12 text-slate-700 font-bold border-gray-300">
                                            Autentificare
                                        </Button>
                                    </Link>
                                    <Link href="/signup" onClick={() => setIsOpen(false)}>
                                        <Button className="w-full justify-start h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                                            <User className="mr-2 h-4 w-4" /> Creează Cont Gratuit
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Footer Sidebar */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-400">© 2025 NidusHomes</p>
                        </div>

                    </SheetContent>
                </Sheet>
            </div>

            {/* --- ZONA CENTRU: SEARCH BAR (MOBIL) --- */}
            <div className="flex-1 mx-2 md:hidden">
                <div className="relative w-full">
                    <Input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearch}
                        placeholder="Cauta adresa, cartier..."
                        // STIL IDENTIC CU FILTERBAR: Alb, Border, h-10
                        className="w-full h-10 border-gray-300 pl-3 pr-10 focus-visible:ring-blue-500 bg-white"
                    />
                    
                    {/* Logica pentru butonul din dreapta (X sau Lupa) */}
                    {searchQuery ? (
                        <button 
                            onClick={() => {
                                setSearchQuery('');
                                // Opțional: Dacă vrei să resetezi și URL-ul când ștergi textul:
                                // const params = new URLSearchParams(searchParams.toString());
                                // params.delete('q');
                                // router.push(`/?${params.toString()}`);
                            }}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    ) : (
                        <button 
                            // Facem butonul de lupa sa declanseze cautarea si la click
                            onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                if (searchQuery.trim()) params.set('q', searchQuery);
                                router.push(`/?${params.toString()}`);
                            }}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <Search className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* CENTRU */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Link href="/" className="flex items-center gap-2 group">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter hidden sm:block">
                        Nidus<span className="text-blue-700">Homes</span>
                    </span>
                </Link>
            </div>

            {/* DREAPTA */}
            <div className="flex items-center gap-4">

                {loading ? (
                    <span>Se încarcă...</span> 
                ) :user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                className="relative bg-neutral-50 h-12 rounded-3xl pl-1 pr-4 gap-2 hover:bg-gray-100 hover:border-gray-300 transition-all group"
                            >
                                <Avatar className="h-10 w-10 transition-transform group-hover:scale-105">
                                    <AvatarImage src={user.user_metadata?.avatar_url} alt="Profile" className="object-cover" />
                                    <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs">
                                        {getInitials()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="hidden md:flex flex-col items-start text-xs">
                                    <span className="font-semibold text-slate-800 max-w-20 truncate ">
                                        {user.user_metadata?.full_name || 'Utilizator'}
                                    </span>
                                </div>
                                <ChevronDown size={14} className="text-gray-400 group-data-[state=open]:rotate-180 transition-transform duration-300" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-60 p-2 mt-2" align="end" forceMount>
                            {/* Header User */}
                            <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg mb-2">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                                    {user.user_metadata?.avatar_url ? (
                                        <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                                    ) : getInitials()}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-slate-900 truncate">{user.user_metadata?.full_name || 'Salut!'}</p>
                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                </div>
                            </div>

                            <DropdownMenuGroup>
                                <DropdownMenuItem asChild>
                                    <Link href="/account" className="cursor-pointer flex items-center gap-2 py-2.5 rounded-md focus:bg-blue-50 focus:text-blue-700">
                                        <Settings className="h-4 w-4 text-slate-500" />
                                        <span className="font-medium">Setari Cont</span>
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <Link href="/favorites" className="cursor-pointer flex items-center gap-2 py-2.5 rounded-md focus:bg-blue-50 focus:text-blue-700">
                                        <Heart className="h-4 w-4 text-slate-500" />
                                        <span className="font-medium">Favorite</span>
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <Link href="/my-listings" className="cursor-pointer flex items-center gap-2 py-2.5 rounded-md focus:bg-blue-50 focus:text-blue-700">
                                        <LayoutList className="h-4 w-4 text-slate-500" />
                                        <span className="font-medium" >Anunturile mele</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/add" className="cursor-pointer flex items-center gap-2 py-2.5 rounded-md focus:bg-blue-50 focus:text-blue-700">
                                        <Layout className="h-4 w-4 text-slate-500" />
                                        <span className="font-medium" >Adauga anunt</span>
                                    </Link>
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem asChild>
                                    <Link href="/inbox" className="cursor-pointer flex items-center gap-2 py-2.5 rounded-md focus:bg-blue-50 focus:text-blue-700">
                                        <MessageCircle className="h-4 w-4 text-slate-500" />
                                        <span className="font-medium" >Conversatiile mele</span>
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>

                            <DropdownMenuSeparator className="my-2 bg-gray-100" />
                            
                            {/* --- LOGICA CONDITIONALĂ PENTRU AGENT --- */}
                            
                            {isAgent ? (
                                <>
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 rounded mb-1 mx-1">
                                        Cont Agent
                                    </div>
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem asChild>
                                            <Link href="/agent/dashboard" className="cursor-pointer flex items-center gap-2 py-2.5 rounded-md focus:bg-blue-50 focus:text-blue-700">
                                                <LayoutDashboard className="h-4 w-4 text-slate-500" />
                                                <span className="font-medium">Dashboard</span>
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild>
                                            <Link href="/agent/settings" className="cursor-pointer flex items-center gap-2 py-2.5 rounded-md focus:bg-blue-50 focus:text-blue-700">
                                                <Briefcase className="h-4 w-4 text-slate-500" />
                                                <span className="font-medium">Profil Agent</span>
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </>
                            ) : (
                                /* DACA NU ESTE AGENT - Arătăm opțiunea să devină */
                                <DropdownMenuGroup>
                                    <DropdownMenuItem asChild>
                                        <Link href="/agent/settings" className="cursor-pointer flex items-center gap-2 py-2.5 rounded-md hover:bg-slate-900 hover:text-white transition-colors group">
                                            <PlusCircle className="h-4 w-4 text-slate-500 group-hover:text-white" />
                                            <span className="font-medium">Devino Agent / Firmă</span>
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            )}

                            <DropdownMenuSeparator className="my-2 bg-gray-100" />

                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer flex items-center gap-2 py-2.5 font-medium"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Deconectare</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <div className="flex items-center gap-2">
                        <Link href="/login">
                            <Button variant="ghost" className="font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                                Autentificare
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button className="rounded-full font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5">
                                <User className="mr-2 h-4 w-4" /> Înregistrare
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </header>

 
    );
}