'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Info } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';

export default function PriceHistoryChart({ listingId }: { listingId: number }) {
    const supabase = createClient();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDemo, setIsDemo] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            // Incercam sa luam date reale
            const { data: history } = await supabase
                .from('price_history')
                .select('price, scanned_at')
                .eq('listing_id', listingId)
                .order('scanned_at', { ascending: true });

            // Verificam daca avem destule date
            if (history && history.length > 1) {
                // Avem date reale! Le formatam.
                const formattedData = history.map(item => ({
                    date: new Date(item.scanned_at).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' }),
                    price: item.price
                }));
                setData(formattedData);
            } else {
                // NU avem date (sau e doar una). Generam date DEMO pentru prezentare.
                setIsDemo(true);
                generateDemoData();
            }
            setLoading(false);
        };

        fetchData();
    }, [listingId]);

    // Functie pentru a genera date false demo
    const generateDemoData = () => {
        const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun'];
        // Generam un pret de baza aleatoriu Intre 80k și 120k
        let currentPrice = 85000 + Math.random() * 20000;

        const fakeData = months.map(month => {
            // Fluctuatie mica +/-
            const change = (Math.random() - 0.4) * 2000;
            currentPrice += change;
            return {
                date: month,
                price: Math.round(currentPrice)
            };
        });
        setData(fakeData);
    };

    const formatCurrency = (val: number) => {
        return `${(val / 1000).toFixed(0)}k €`;
    };

    if (loading) return <div className="h-64 bg-gray-50 rounded-xl animate-pulse"></div>;

    return (
        <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-white border-b border-gray-50 pb-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                        <TrendingUp className="text-green-600" size={20} />
                        Istoric Pret
                    </CardTitle>
                    {isDemo && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex items-center gap-1">
                            <Info size={10} /> Date Estimate (Demo)
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="h-75 w-full mt-4 pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                tickFormatter={formatCurrency}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                formatter={(value: number | undefined) => value !== undefined ? [`${value.toLocaleString()} €`, 'Pret'] : ['', 'Pret']}
                            />
                            <Area
                                type="monotone"
                                dataKey="price"
                                stroke="#2563eb"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}