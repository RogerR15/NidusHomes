'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function FilterBar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

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

    // INITIALIZARE
    // Asta asigura ca daca dai refresh, inputurile sunt completate corect.
    useEffect(() => {
        setFilters({
            neighborhood: searchParams.get('q') || '',
            transaction_type: searchParams.get('type') || searchParams.get('transaction_type') || 'SALE',
            min_price: searchParams.get('min_price') || '',
            max_price: searchParams.get('max_price') || '',
            rooms: searchParams.get('rooms') || '',
        });
    }, [searchParams]);

    // FUNCTIA CARE TRIMITE DATELE IN URL (COMMIT)
    // Aceasta se apeleaza DOAR cand utilizatorul a terminat de ales (Enter, Apply, Click optiune)
    const commitFiltersToURL = (currentFilters: typeof filters) => {
        const params = new URLSearchParams(); // Pornim curat, reconstruim URL-ul pe baza statului curent

        // Pastram parametrii existenti care nu tin de filtrare (daca exista)
        // searchParams.forEach((value, key) => params.set(key, value)); 

        // Scriem noile valori
        if (currentFilters.transaction_type) params.set('type', currentFilters.transaction_type);

        if (currentFilters.neighborhood) params.set('q', currentFilters.neighborhood);

        if (currentFilters.min_price) params.set('min_price', currentFilters.min_price);

        if (currentFilters.max_price) params.set('max_price', currentFilters.max_price);

        if (currentFilters.rooms && currentFilters.rooms !== 'all') {
            params.set('rooms', currentFilters.rooms);
        }

        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    //HANDLERS PENTRU INPUTURI

    // A. Pentru TEXT (Search, Pret) - Actualizeaza doar State-ul Local
    const handleLocalChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    // B. Pentru SEARCH (Cand dai Enter sau Click pe Lupa)
    const handleSearchSubmit = () => {
        commitFiltersToURL(filters);
    };

    // C. Pentru DROPDOWNS (Type, Rooms)
    const handleImmediateSelection = (field: string, value: string) => {
        const updatedFilters = { ...filters, [field]: value };
        setFilters(updatedFilters); // Update vizual
        commitFiltersToURL(updatedFilters); // Update URL
    };

    // D. Pentru Pret (Butonul Apply)
    const handlePriceApply = () => {
        commitFiltersToURL(filters);
        setOpenPrice(false);
    };

    // E. Enter Key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearchSubmit();
            setOpenPrice(false); // Inchidem si popover-ul de pret daca suntem acolo
        }
    };

    // Etichete
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

    const triggerStyles = "h-12 px-4 justify-between font-normal border-gray-300 hover:bg-gray-50 hover:text-gray-900 bg-white";
    const activeTriggerStyles = "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-50 hover:text-blue-700 font-medium";

    return (
        <div className="bg-white border-b border-gray-200 p-3 flex flex-col lg:flex-row gap-3 items-center shadow-sm sticky top-0 z-30">

            {/* SEARCH BAR */}
            <div className="relative w-full lg:w-80 shrink-0">
                <Input
                    type="text"
                    placeholder="Cauta adresa, cartier..."
                    className="w-full h-12 border-gray-300 pl-3 pr-10 focus-visible:ring-blue-500 bg-white"
                    value={filters.neighborhood}
                    onChange={(e) => handleLocalChange('neighborhood', e.target.value)} // Doar local
                    onKeyDown={handleKeyDown} // Commit la Enter
                />
                {filters.neighborhood ? (
                    <button
                        onClick={() => {
                            const reset = { ...filters, neighborhood: '' };
                            setFilters(reset);
                            commitFiltersToURL(reset);
                        }}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                ) : (
                    <button onClick={handleSearchSubmit} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                        <Search className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* FILTRE */}
            <div className="flex flex-wrap gap-2 w-full items-center">

                {/* A. Tip Tranzactie */}
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

                {/* B. Pret */}
                <Popover open={openPrice} onOpenChange={setOpenPrice}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn(triggerStyles, (filters.min_price || filters.max_price || openPrice) ? activeTriggerStyles : "")}>
                            <span className="truncate max-w-37.5">{getPriceLabel()}</span>
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="start">
                        <h3 className="font-bold text-gray-700 mb-3 text-sm">Interval Pret (€)</h3>
                        <div className="flex gap-2 items-center mb-4">
                            <div className="w-1/2">
                                <Input
                                    type="number"
                                    placeholder="Min"
                                    value={filters.min_price}
                                    onChange={(e) => handleLocalChange('min_price', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="h-9"
                                />
                            </div>
                            <span className="text-gray-400">-</span>
                            <div className="w-1/2">
                                <Input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.max_price}
                                    onChange={(e) => handleLocalChange('max_price', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handlePriceApply}>Aplica</Button>
                    </PopoverContent>
                </Popover>

                {/* C. Camere */}
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
                                <button
                                    key={val}
                                    onClick={() => { handleImmediateSelection('rooms', val); setOpenBeds(false); }}
                                    className={cn("text-left px-3 py-2 rounded text-sm flex items-center justify-between transition-colors", (filters.rooms === val || (val === 'all' && filters.rooms === '')) ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-50 text-gray-700')}
                                >
                                    {val === 'all' ? 'Oricate' : `${val}+ Camere`}
                                    {(filters.rooms === val || (val === 'all' && filters.rooms === '')) && <Check className="h-4 w-4 text-blue-600" />}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

            </div>

            <div className="ml-auto flex items-center gap-3">
                <Button variant="link" className="text-blue-600 font-bold text-sm hidden lg:block">Salveaza Cautarea</Button>
            </div>
        </div>
    );
}