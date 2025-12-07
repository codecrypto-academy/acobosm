// TestLayout.tsx (Solo para probar el layout lateral)
"use client";
import React, { useState } from 'react';

// Simulación de la función getTabClasses (usamos clases de ejemplo)
const getTabClasses = (activeTab: string, tabName: string) => {
    const base = "w-full p-4 text-left font-bold transition duration-300 border-l-4 rounded-r-lg shadow-sm mb-1";
    const active = "bg-blue-100 text-blue-800 border-blue-600 shadow-md";
    const inactive = "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent";

    return activeTab === tabName ? `${base} ${active}` : `${base} ${inactive}`;
};

export default function LayoutTestPage() {
    const [activeTab, setActiveTab] = useState('Wallet');

    return (
        // EL CONTENEDOR ANCESTRAL DEBE SER 'min-h-screen' o algo similar 
        // y debe tener espacio para ver la diferencia.
        <div className="min-h-screen bg-gray-50 p-8">

            {/* 🛑 ESTE ES EL DIV PADRE: GRID 🛑 */}
            {/*<div className="grid grid-cols-4 bg-white shadow-2xl rounded-xl max-w-6xl mx-auto p-0 border border-gray-200">*/}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr'
                }}
                className="bg-white shadow-2xl rounded-xl max-w-6xl mx-auto p-0 border border-gray-200">
                {/*<div className="flex flex-row flex-nowrap bg-white shadow-2xl rounded-xl max-w-6xl mx-auto p-0 border border-gray-200"> // ******* LINEA A ELIMINAR ******* */}

                {/* 1. BARRA DE NAVEGACIÓN LATERAL (w-1/4) - HIJO DIRECTO: BARRA LATERAL (1/4 del ancho) */}
                {/*<div className="p-0 bg-gray-100 border-r border-gray-200 rounded-bl-xl col-span-1">
                    {/*<div className="w-1/4 p-0 bg-gray-100 border-r border-gray-200 rounded-bl-xl">*/}

                {/*<button onClick={() => setActiveTab('Wallet')} className={`${getTabClasses(activeTab, 'Wallet')} w-full`}>
                        1. Conexión (Lateral)
                    </button>

                    <button onClick={() => setActiveTab('Register')} className={`${getTabClasses(activeTab, 'Register')} w-full`}>
                        2. Registrar (Lateral)
                    </button>*/}

                {/* Más botones... */}
                {/*</div>*/}

                {/* 2. CONTENIDO PRINCIPAL (w-3/4) - HIJO DIRECTO: CONTENIDO PRINCIPAL (3/4 del ancho) */}
                {/*<div className="w-3/4 p-6 bg-blue-50">*/}
                {/*<div className="p-6 bg-blue-50 col-span-3">
                    <h2>Contenido de la Sección {activeTab}</h2>
                    <p>Si ve esto a la derecha de las pestañas, ¡el layout está correcto!</p>*/}
                {/*<h2 className="text-2xl font-bold">Contenido de la Sección {activeTab}</h2>
                    <p className="mt-2 text-gray-600">Si ve esto a la derecha de las pestañas, ¡el layout está correcto!</p>*/}
                {/*</div>*/}

                {/* COLUMNA 1 (col-span-1) */}
                <div className="p-4 bg-yellow-100 border-r border-gray-200 col-span-1">
                    <h2>COLUMNA 1 (1/4) - Tabs Aquí</h2>
                </div>

                {/* COLUMNA 2 (col-span-1) */}
                <div className="p-4 bg-green-100 border-r border-gray-200 col-span-1">
                    <h2>COLUMNA 2 (1/4) - Contenido Aquí</h2>
                </div>

                {/* COLUMNA 3 (col-span-1) */}
                <div className="p-4 bg-blue-100 border-r border-gray-200 col-span-1">
                    <h2>COLUMNA 3 (1/4)</h2>
                </div>

                {/* COLUMNA 4 (col-span-1) */}
                <div className="p-4 bg-red-100 col-span-1">
                    <h2>COLUMNA 4 (1/4)</h2>
                </div>

            </div>

            {/* Footer o más contenido... */}
        </div >
    );
}

// Para usarlo, simplemente importe y renderice <TestLayout /> en su archivo principal.