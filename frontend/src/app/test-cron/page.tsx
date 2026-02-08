'use client';
import { useState } from "react";

export default function TestCronPage() {
  const [status, setStatus] = useState("");

  const triggerCron = async () => {
    setStatus("Se rulează...");
    try {
      // Apelam API-ul cu parola secreta
      const res = await fetch('/api/cron/send-alerts', {
        headers: { 
            // ATENTIE: Aici trebuie sa pui aceeasi parola ca in .env.local
            'Authorization': 'Bearer robert_cron_runner_secret_123'
        }
      });
      const data = await res.json();
      setStatus(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setStatus("Eroare: " + err.message);
    }
  };

  return (
    <div className="p-10 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">Panou Control Alerte</h1>
      <button 
        onClick={triggerCron} 
        className="px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg"
      >
        🚀 PORNEȘTE MANUAL ALERTELE
      </button>
      <pre className="bg-gray-100 p-4 rounded w-full max-w-lg overflow-auto">
        {status}
      </pre>
    </div>
  );
}