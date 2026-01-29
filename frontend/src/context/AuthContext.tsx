'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { createClient } from '../../utils/supabase/client';

interface AuthContextType {
    user: any | null;
    isAgent: boolean;
    loading: boolean;
    checkAgentStatus: () => Promise<void>; // Funcție ca să poți re-verifica manual dacă e nevoie
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAgent: false,
    loading: true,
    checkAgentStatus: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any | null>(null);
    const [isAgent, setIsAgent] = useState(false);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // Funcția care verifică la API
    const checkAgentStatus = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                setUser(null);
                setIsAgent(false);
                setLoading(false);
                return;
            }

            setUser(session.user);

            // Verificăm API-ul tău Python
            const res = await axios.get('http://127.0.0.1:8000/agent/check-status', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            
            setIsAgent(res.data.is_agent);

        } catch (error) {
            console.error("Eroare verificare agent:", error);
            setIsAgent(false);
        } finally {
            setLoading(false);
        }
    };

    // Rulăm verificarea la încărcarea site-ului
    useEffect(() => {
        checkAgentStatus();

        // Ascultăm schimbările de auth (Login/Logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user);
                // Opțional: poți re-verifica statusul de agent aici, dar de obicei e salvat
            } else {
                setUser(null);
                setIsAgent(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAgent, loading, checkAgentStatus }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook personalizat ca să fie ușor de folosit în alte componente
export const useAuth = () => useContext(AuthContext);