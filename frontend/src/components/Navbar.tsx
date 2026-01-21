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
    Sparkles
} from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';


// SHADCN IMPORTS
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { createClient } from '../../utils/supabase/client';

export default function Navbar() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentPath = usePathname();
    const currentType = searchParams.get('type') || 'SALE';
    const supabase = createClient();

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
        setUser(null);
    };

    const isActive = (type: string) => {
        return currentType === type
            ? "text-blue-600 font-bold border-b-2 border-blue-600"
            : "text-slate-600 font-medium hover:text-blue-600 transition-colors";
    };

    // Helper pentru inițiale (cu gradient background)
    const getInitials = () => {
        const name = user?.user_metadata?.full_name || user?.email || 'U';
        return name.slice(0, 1).toUpperCase();
    }

    return (
        <header className="sticky top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 py-3 px-4 md:px-8 flex items-center justify-between z-50 transition-all">

            {/* STANGA: Navigație Principală */}
            <nav className="hidden md:flex items-center gap-8">
                <Link href="/?type=SALE" className={`py-2 text-sm ${isActive('SALE')}`}>Cumpără</Link>
                <Link href="/?type=RENT" className={`py-2 text-sm ${isActive('RENT')}`}>Închiriază</Link>
                <Link href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Vinde</Link>
            </nav>

            {/* MOBIL: Meniu Hamburger */}
            <div className="md:hidden">
                <Button variant="ghost" size="icon" className="text-slate-700">
                    <Menu size={24} />
                </Button>
            </div>

            {/* CENTRU: Logo */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Link href="/" className="flex items-center gap-2 group">
                    {/* <div className="relative w-10 h-10 transform transition-transform duration-300">
                        <Image
                            src="/logo.png"       
                            alt="NidusHomes Logo"
                            fill
                            sizes="40px"         
                            className="object-contain" 
                            priority              
                        />
                    </div> */}
                    <span className="text-3xl font-black text-slate-900 tracking-tighter hidden sm:block">
                        Nidus<span className="text-blue-700">Homes</span>
                    </span>
                </Link>
            </div>

            {/* DREAPTA: Profil & Dropdown */}
            <div className="flex items-center gap-4">

                {user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            {/* Butonul "Pastilă" */}
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
                                        <span className="font-medium">Setări Cont</span>
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <Link href="/favorites" className="cursor-pointer flex items-center gap-2 py-2.5 rounded-md focus:bg-blue-50 focus:text-blue-700">
                                        <Heart className="h-4 w-4 text-slate-500" />
                                        <span className="font-medium">Favorite</span>
                                    </Link>
                                </DropdownMenuItem>

                                {/* Opțiune Future-Proof */}
                                <DropdownMenuItem disabled className="opacity-50 flex items-center gap-2 py-2.5">
                                    <LayoutDashboard className="h-4 w-4" />
                                    <span>Anunțurile mele</span>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>

                            <DropdownMenuSeparator className="my-2" />

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