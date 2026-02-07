'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, ChevronDown, Check, X, Bell, TrendingUp, Save, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import PriceHistoryChart from './PriceHistoryChart'; // <--- IMPORTA COMPONENTA TA
import { createClient } from '../../utils/supabase/client';
import { Switch } from './ui/switch';


export default function FilterBar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = createClient();

    // STATE LOCAL PENTRU FILTRE
    const [filters, setFilters] = useState({
        neighborhood: '',
        transaction_type: 'SALE',
        min_price: '',
        max_price: '',
        rooms: '',
    });

    const [openType, setOpenType] = useState(false);
    const [openPrice, setOpenPrice] = useState(false);
    const [openBeds, setOpenBeds] = useState(false);
    
    // STATE PENTRU MODALE
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [notifyEmail, setNotifyEmail] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // INITIALIZARE
    useEffect(() => {
        setFilters({
            neighborhood: searchParams.get('q') || '',
            transaction_type: searchParams.get('type') || searchParams.get('transaction_type') || 'SALE',
            min_price: searchParams.get('min_price') || '',
            max_price: searchParams.get('max_price') || '',
            rooms: searchParams.get('rooms') || '',
        });
    }, [searchParams]);

    // --- FUNCTII URL ---
    const commitFiltersToURL = (currentFilters: typeof filters) => {
        const params = new URLSearchParams(); 
        if (currentFilters.transaction_type) params.set('type', currentFilters.transaction_type);
        if (currentFilters.neighborhood) params.set('q', currentFilters.neighborhood);
        if (currentFilters.min_price) params.set('min_price', currentFilters.min_price);
        if (currentFilters.max_price) params.set('max_price', currentFilters.max_price);
        if (currentFilters.rooms && currentFilters.rooms !== 'all') {
            params.set('rooms', currentFilters.rooms);
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // --- HANDLERS UI ---
    const handleLocalChange = (field: string, value: string) => setFilters(prev => ({ ...prev, [field]: value }));
    const handleSearchSubmit = () => commitFiltersToURL(filters);
    const handleImmediateSelection = (field: string, value: string) => {
        const updated = { ...filters, [field]: value };
        setFilters(updated); 
        commitFiltersToURL(updated); 
    };
    const handlePriceApply = () => { commitFiltersToURL(filters); setOpenPrice(false); };
    const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { handleSearchSubmit(); setOpenPrice(false); } };

    // --- LOGICA SALVARE CAUTARE ---
    const handleSaveSearch = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                alert("Trebuie să fii autentificat pentru a salva căutarea!");
                router.push('/login');
                return;
            }

            const { error } = await supabase.from('saved_searches').insert({
                user_id: user.id,
                name: saveName || `Căutare ${filters.neighborhood || 'Zona'} - ${new Date().toLocaleDateString('ro-RO')}`,
                filters: filters,
                notify_email: notifyEmail
            });

            if (error) throw error;

            alert("Căutarea a fost salvată cu succes!");
            setIsSaveOpen(false);
            setSaveName('');
        } catch (error) {
            console.error(error);
            alert("Eroare la salvare. Încearcă din nou.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetFilters = () => {
        const defaultFilters = {
            neighborhood: '',
            transaction_type: 'SALE', // Sau poti lasa ce e selectat daca vrei, dar 'SALE' e default
            min_price: '',
            max_price: '',
            rooms: '',
        };
        setFilters(defaultFilters);
        commitFiltersToURL(defaultFilters);
    };
    const hasActiveFilters = 
        filters.neighborhood !== '' ||
        filters.min_price !== '' ||
        filters.max_price !== '' ||
        (filters.rooms !== '' && filters.rooms !== 'all');

    // --- LABELS ---
    const getPriceLabel = () => {
        if (filters.min_price && filters.max_price) return `${filters.min_price} € - ${filters.max_price} €`;
        if (filters.max_price) return `Pana la ${filters.max_price} €`;
        if (filters.min_price) return `Peste ${filters.min_price} €`;
        return "Pret";
    };

    const getBedsLabel = () => {
        if (filters.rooms && filters.rooms !== 'all') return `${filters.rooms}+ Camere`;
        return "Camere";
    };

    const triggerStyles = "h-10 lg:h-12 px-3 lg:px-4 justify-between font-normal border-gray-300 hover:bg-gray-50 hover:text-gray-900 bg-white text-sm whitespace-nowrap";
    const activeTriggerStyles = "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-50 hover:text-blue-700 font-medium";

    return (
        <div className="bg-white border-b border-gray-200 p-2 lg:p-3 flex flex-col lg:flex-row gap-2 lg:gap-3 items-center shadow-sm sticky top-0 z-30">

            {/* SEARCH BAR (Desktop) */}
            <div className="relative w-full lg:w-80 shrink-0 hidden md:block">
                <Input
                    type="text"
                    placeholder="Cauta adresa, cartier..."
                    className="w-full h-10 lg:h-12 border-gray-300 pl-3 pr-10 focus-visible:ring-blue-500 bg-white"
                    value={filters.neighborhood}
                    onChange={(e) => handleLocalChange('neighborhood', e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                {filters.neighborhood ? (
                    <button onClick={() => { setFilters({ ...filters, neighborhood: '' }); commitFiltersToURL({ ...filters, neighborhood: '' }); }} className="absolute right-3 top-2.5 lg:top-3.5 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                ) : (
                    <button onClick={handleSearchSubmit} className="absolute right-3 top-2.5 lg:top-3.5 text-gray-400 hover:text-gray-600"><Search className="h-5 w-5" /></button>
                )}
            </div>

            {/* FILTRE */}
            <div className="flex flex-row overflow-x-auto pb-1 lg:pb-0 gap-2 w-full items-center no-scrollbar">
                
                {/* Tip Tranzactie */}
                <Popover open={openType} onOpenChange={setOpenType}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn(triggerStyles, filters.transaction_type ? "" : "")}>
                            {filters.transaction_type === 'SALE' ? 'De Vanzare' : 'De Inchiriat'}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                        <div className="flex flex-col gap-1">
                            <button onClick={() => { handleImmediateSelection('transaction_type', 'SALE'); setOpenType(false); }} className={cn("text-left px-4 py-2 rounded text-sm transition-colors", filters.transaction_type === 'SALE' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-50')}>De Vanzare</button>
                            <button onClick={() => { handleImmediateSelection('transaction_type', 'RENT'); setOpenType(false); }} className={cn("text-left px-4 py-2 rounded text-sm transition-colors", filters.transaction_type === 'RENT' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-50')}>De Inchiriat</button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Pret */}
                <Popover open={openPrice} onOpenChange={setOpenPrice}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn(triggerStyles, (filters.min_price || filters.max_price || openPrice) ? activeTriggerStyles : "")}>
                            <span className="truncate max-w-25 lg:max-w-37.5">{getPriceLabel()}</span>
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="start">
                        <h3 className="font-bold text-gray-700 mb-3 text-sm">Interval Pret (€)</h3>
                        <div className="flex gap-2 items-center mb-4">
                            <div className="w-1/2"><Input type="number" placeholder="Min" value={filters.min_price} onChange={(e) => handleLocalChange('min_price', e.target.value)} onKeyDown={handleKeyDown} className="h-9" /></div>
                            <span className="text-gray-400">-</span>
                            <div className="w-1/2"><Input type="number" placeholder="Max" value={filters.max_price} onChange={(e) => handleLocalChange('max_price', e.target.value)} onKeyDown={handleKeyDown} className="h-9" /></div>
                        </div>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handlePriceApply}>Aplica</Button>
                    </PopoverContent>
                </Popover>

                {/* Camere */}
                <Popover open={openBeds} onOpenChange={setOpenBeds}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn(triggerStyles, (filters.rooms && filters.rooms !== 'all') || openBeds ? activeTriggerStyles : "")}>
                            {getBedsLabel()}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                        <h3 className="font-bold text-gray-700 mb-2 px-2 text-sm">Numar Camere</h3>
                        <div className="flex flex-col gap-1">
                            {['all', '1', '2', '3', '4'].map((val) => (
                                <button key={val} onClick={() => { handleImmediateSelection('rooms', val); setOpenBeds(false); }} className={cn("text-left px-3 py-2 rounded text-sm flex items-center justify-between transition-colors", (filters.rooms === val || (val === 'all' && filters.rooms === '')) ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-50 text-gray-700')}>
                                    {val === 'all' ? 'Oricate' : `${val}+ Camere`}
                                    {(filters.rooms === val || (val === 'all' && filters.rooms === '')) && <Check className="h-4 w-4 text-blue-600" />}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
                
            </div>

            {/* --- ACTIUNI DREAPTA --- */}
            <div className="ml-auto flex items-center gap-2">
                
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetFilters}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600 gap-2 border border-red-100 lg:border-transparent"
                        title="Reseteaza filtrele"
                    >
                        <RotateCcw className="h-4 w-4" />
                        <span className="hidden lg:inline font-semibold">Resetează filtrele</span>
                    </Button>
                )}

                {/* BUTON SALVEAZA CAUTAREA */}
                <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="hidden lg:flex gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Save className="h-4 w-4" />
                            <span className="font-bold text-xs">Salveaza Cautarea</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-106.25 bg-white">
                        <DialogHeader>
                            <DialogTitle>Salvează Căutarea</DialogTitle>
                            <DialogDescription>
                                Vei primi notificări când apar anunțuri noi care corespund criteriilor tale.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nume Căutare</Label>
                                <Input 
                                    id="name" 
                                    placeholder="Ex: Apartamente Tudor 2 camere" 
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center space-x-2 border p-3 rounded-lg bg-slate-50">
                                <Switch id="airplane-mode" checked={notifyEmail} onCheckedChange={setNotifyEmail} />
                                <div className="flex-1">
                                    <Label htmlFor="airplane-mode" className="font-bold flex items-center gap-2">
                                        <Bell className="h-3 w-3" /> Notificări Email
                                    </Label>
                                    <p className="text-xs text-slate-500">Primește email zilnic cu noutățile.</p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button disabled={isSaving} onClick={handleSaveSearch} className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full">
                                {isSaving ? 'Se salvează...' : 'Salvează Căutarea'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}