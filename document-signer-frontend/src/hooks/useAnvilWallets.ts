// Archivo: src/hooks/useAnvilWallets.ts
'use client';

import { useState, useEffect, useCallback } from 'react'; // Asegúrate de que 'useState', 'useEffect', 'useCallback' estén importados
//import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { JsonRpcProvider, Wallet, Contract, ethers } from 'ethers'; // ¡Añade 'ethers'!
import { DOCUMENT_REGISTRY_ADDRESS, DOCUMENT_REGISTRY_ABI } from '@/config';

// URL por defecto del nodo Anvil (o cualquier nodo local)
const ANVIL_URL = 'http://127.0.0.1:8545';

/**
 * Hook personalizado para manejar la conexión al nodo Anvil
 * y las 10 wallets de prueba, e instanciar el contrato.
 */
export const useAnvilWallets = () => {
    // ESTADO: Lista de las 10 wallets de prueba (Ethers.js Wallet objects)
    const [wallets, setWallets] = useState<Wallet[]>([]);
    // ESTADO: Proveedor de red (conexión con Anvil)
    const [provider, setProvider] = useState<JsonRpcProvider | null>(null);
    // ESTADO: Wallet actualmente seleccionada por el usuario
    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    // ESTADO: Instancia del contrato DocumentRegistry (¡NUEVO!)
    const [documentRegistryContract, setDocumentRegistryContract] = useState<Contract | null>(null);
    // ESTADO: Estado de la conexión
    const [isConnected, setIsConnected] = useState(false);
    // ESTADO: Manejo de errores
    const [error, setError] = useState<string | null>(null);

    // 1. Inicializa el Provider, el Contrato y carga las 10 wallets
    const loadAnvilConfig = useCallback(async () => {
        try {
            setError(null);

            // Creamos el proveedor de red
            const newProvider = new JsonRpcProvider(ANVIL_URL);
            setProvider(newProvider);

            // *** NUEVO: Crear la instancia del contrato (Paso de Integración) ***
            const contractInstance = new Contract(
                DOCUMENT_REGISTRY_ADDRESS,
                DOCUMENT_REGISTRY_ABI,
                newProvider
            );
            setDocumentRegistryContract(contractInstance);
            // *******************************************************************

            // Ethers.js V6 requiere una clave privada para crear una Wallet.
            // Anvil usa un mnemónico fijo para generar las 10 cuentas.
            const mnemonic = "test test test test test test test test test test test junk";
            const loadedWallets: Wallet[] = [];

            // *** LÓGICA DE FONDEO MÁS RESISTENTE ***

            // 1. Obtenemos el Funder (la Cuenta #0 de Anvil) a través del Provider.
            // Usamos el índice 0, que es la primera cuenta que tiene saldo.
            // Nota: Aunque Ethers v6 desaconseja getSigner, es la forma más rápida y confiable
            // para obtener el Signer MAESTRO en un nodo local como Anvil.
            const funder = await newProvider.getSigner(0);
            console.log(`✅ Wallet #0 (Funder: ${await funder.getAddress()}) lista para fondear.`);

            // 2. Generamos las 10 Wallets (índices 0 a 9).
            for (let i = 1; i < 10; i++) {
                // Creamos la Wallet, derivándola, pero sin usarla como funder.
                const derivedWallet = Wallet.fromPhrase(mnemonic, newProvider).connect(newProvider).deriveChild(i);
                loadedWallets.push(derivedWallet);

                // 3. Enviamos fondos desde el Funder a todas las cuentas (excepto la #0, si es el caso)
                //if (i !== 0) {
                const fundTx = await funder.sendTransaction({
                    to: derivedWallet.address,
                    value: ethers.parseEther("10.0") // 10 ETH
                });
                await fundTx.wait();
                console.log(`✅ Fondeo de 10 ETH a Wallet #${i} completado.`);
                //} else {
                //console.log(`✅ Wallet #0 (Funder) lista.`);
            }


            setWallets(loadedWallets);
            setIsConnected(true);
        } catch (err: any) {
            console.error("Error al conectar con Anvil:", err);
            setError(`Error de conexión: ${err.message || "Verifica que Anvil esté corriendo."}`);
            setIsConnected(false);
        }
    }, []);

    // 2. Conexión Inicial al montar el componente
    useEffect(() => {
        loadAnvilConfig();
    }, [loadAnvilConfig]);

    // 3. Función para seleccionar una wallet por índice
    const selectWallet = (index: number) => {
        if (index >= 0 && index < wallets.length) {
            setSelectedWallet(wallets[index]);
            setError(null);
        } else {
            setError("Índice de wallet inválido.");
        }
    };

    // 4. Retornamos la configuración
    return {
        provider,
        wallets,
        selectedWallet,
        documentRegistryContract, // ¡NUEVO! Devolvemos la instancia del contrato
        isConnected,
        selectWallet,
        error,
        ANVIL_URL
    };
};