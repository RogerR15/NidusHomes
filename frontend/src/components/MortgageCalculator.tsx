'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Banknote, Percent, CalendarClock } from 'lucide-react';

interface MortgageCalculatorProps {
    price: number;
}

export default function MortgageCalculator({ price }: MortgageCalculatorProps) {
    // State-uri pentru calculator
    const [downPaymentPercent, setDownPaymentPercent] = useState(15); // Avans 15% standard
    const [interestRate, setInterestRate] = useState(5.9); // Dobanda medie
    const [years, setYears] = useState(30); // 30 de ani

    // State-uri calculate
    const [monthlyPayment, setMonthlyPayment] = useState(0);
    const [downPaymentAmount, setDownPaymentAmount] = useState(0);
    const [loanAmount, setLoanAmount] = useState(0);

    useEffect(() => {
        // 1. Calculam Avansul si Suma Imprumutata
        const downPayment = (price * downPaymentPercent) / 100;
        const loan = price - downPayment;

        setDownPaymentAmount(downPayment);
        setLoanAmount(loan);

        // 2. Calculam Rata Lunara (Formula Matematica)
        // M = P * r * (1 + r)^n / ((1 + r)^n - 1)
        const r = interestRate / 100 / 12; // Rata lunara
        const n = years * 12; // Numar luni

        if (loan > 0 && interestRate > 0 && years > 0) {
            const monthly = loan * ((r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
            setMonthlyPayment(monthly);
        } else {
            setMonthlyPayment(0);
        }

    }, [price, downPaymentPercent, interestRate, years]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                    <Calculator className="text-blue-600" size={20} />
                    Simulator Rate
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid gap-8 md:grid-cols-2">

                {/* COLOANA STANGA: Controale (Input-uri) */}
                <div className="space-y-6">

                    {/* 1. Avans Slider */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-slate-600 font-medium flex items-center gap-2">
                                <Banknote size={16} /> Avans ({downPaymentPercent}%)
                            </Label>
                            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                {formatCurrency(downPaymentAmount)}
                            </span>
                        </div>
                        <Slider
                            value={[downPaymentPercent]}
                            onValueChange={(val) => setDownPaymentPercent(val[0])}
                            max={90}
                            min={5}
                            step={1}
                            className="py-2"
                        />
                        <p className="text-xs text-gray-400">Minim 5% (Prima Casa) sau 15% (Ipotecar)</p>
                    </div>

                    {/* 2. Perioada (Ani) */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-slate-600 font-medium flex items-center gap-2">
                                <CalendarClock size={16} /> Perioada ({years} ani)
                            </Label>
                        </div>
                        <Slider
                            value={[years]}
                            onValueChange={(val) => setYears(val[0])}
                            max={35}
                            min={5}
                            step={1}
                        />
                    </div>

                    {/* 3. Dobanda */}
                    <div className="space-y-2">
                        <Label className="text-slate-600 font-medium flex items-center gap-2">
                            <Percent size={16} /> Dobanda Anuala (%)
                        </Label>
                        <div className="relative">
                            <Input
                                type="number"
                                value={interestRate}
                                onChange={(e) => setInterestRate(Number(e.target.value))}
                                className="pl-3 pr-8"
                                step="0.1"
                            />
                            <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
                        </div>
                    </div>
                </div>

                {/* COLOANA DREAPTA: Rezultatul */}
                <div className="flex flex-col justify-center items-center bg-slate-900 rounded-xl p-6 text-center text-white relative overflow-hidden group">
                    {/* Background Effect */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity"></div>

                    <p className="text-slate-400 text-sm mb-2 uppercase tracking-wider font-semibold z-10">Rata Lunara Estimata</p>

                    <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-linear-to-r from-white to-blue-200 mb-2 z-10">
                        {formatCurrency(monthlyPayment)}
                    </div>

                    <p className="text-xs text-slate-500 mt-4 z-10 max-w-50">
                        *Calcul informativ si simulat. Include doar rata principala si dobanda. Nu include asigurari sau comisioane.
                    </p>

                    <div className="w-full mt-6 pt-6 border-t border-slate-700/50 z-10">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-400">Total Imprumutat:</span>
                            <span className="font-bold">{formatCurrency(loanAmount)}</span>
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}