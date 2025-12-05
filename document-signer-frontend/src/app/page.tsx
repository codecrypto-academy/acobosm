// Archivo: src/app/page.tsx
'use client';

import { useAnvilWallets } from '@/hooks/useAnvilWallets';
import { Wallet, ethers, zeroPadValue } from 'ethers';
import { useEffect, useState, useCallback } from 'react';
import { sha256 } from 'js-sha256';

// Constantes
const DOCUMENT_HASH_BYTES32 = '0x1c3a61250328905b191a3c79a20464f1d24c0d024467c9c0cc959828469d784a'; // Hash de prueba
const INITIAL_HASH_DISPLAY = '0x0000... (Cargue un Archivo)'; // Placeholder inicial

export default function HomePage() {
  const {
    wallets,
    selectedWallet,
    isConnected,
    selectWallet,
    documentRegistryContract, // Importamos la instancia del contrato
    error
  } = useAnvilWallets();

  const [documentHash, setDocumentHash] = useState<string>(INITIAL_HASH_DISPLAY);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any>(null); // Guardará la respuesta de la blockchain
  const [queryLogMessage, setQueryLogMessage] = useState<string | null>(null);
  const [hashToConsult, setHashToConsult] = useState<string>(INITIAL_HASH_DISPLAY);
  const [fileName, setFileName] = useState<string>(''); // Almacena nombre de archivo a ser subido

  // Muestra la dirección de la wallet seleccionada en la consola
  useEffect(() => {
    if (selectedWallet) {
      console.log(`✅ Wallet seleccionada: ${selectedWallet.address}`);
    }
  }, [selectedWallet]);

  // Función para convertir TimeStamp en Human readeable timestamp
  const formatTimestamp = (timestamp: string | number) => {
    const tsNumber = Number(timestamp);
    const date = new Date(tsNumber * 1000);

    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Función para lleer el archivo y calcular el hash
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setFileName(file.name); // Guardamos el nombre del archivo

      const reader = new FileReader();

      // Esta función se ejecuta cuando el archivo se ha cargado en memoria
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          try {
            // 1. Calculamos el hash SHA-256 del buffer binario
            //const hashArray = sha256.array(buffer);

            // 2. Convertimos el hash binario a formato hexadecimal (string)
            // Usamos sha256.arrayToHex para garantizar el formato '0x...'
            const hashHex = '0x' + sha256.hex(buffer);

            // 3. Actualizamos el estado de la DApp
            setDocumentHash(hashHex);
            //setHashToConsult(hashHex);

            alert(`✅ Hash calculado para ${file.name}: ${hashHex.slice(0, 10)}...`);
          } catch (error) {
            console.error("Error al calcular el hash:", error);
            alert("❌ Error: No se pudo calcular el hash del archivo.... :( ");
          }

        }
      };

      // Iniciamos la lectura del archivo como ArrayBuffer (datos binarios)
      reader.readAsArrayBuffer(file);
    }
  };

  /**
   * 1. Genera el Hash del Documento (simulado)
   * En una dApp real, se usaría window.crypto.subtle.digest(SHA-256) sobre el archivo.
   */
  const generateDocumentHash = () => {
    setLogMessage('📄 Generando hash de documento (simulado)...');
    setDocumentHash(DOCUMENT_HASH_BYTES32);
    setLogMessage('✅ Hash listo para firmar.');
  };

  /**
   * 2. Firma el Hash del Documento
   */
  const handleSignAndStore = useCallback(async () => {
    if (!selectedWallet || !documentRegistryContract || documentHash === INITIAL_HASH_DISPLAY) {
      setLogMessage("⚠️ Por favor, selecciona una wallet y genera el hash.");
      return;
    }

    setIsProcessing(true);
    setLogMessage('✍️ Iniciando proceso de firma y almacenamiento...');

    try {
      // ** NUEVA LÍNEA: Formateo a 32 bytes para la Blockchain **
      const hashBytes32 = zeroPadValue(documentHash, 32);

      // 1. Firma el Hash
      const signer = selectedWallet.connect(documentRegistryContract.runner.provider!);
      const messageToSign = documentHash; // El hash es el mensaje

      setLogMessage(`⏳ Wallet ${signer.address.slice(0, 6)}... firmando el hash...`);
      const signature = await signer.signMessage(ethers.getBytes(messageToSign));
      setLogMessage(`✅ Firma generada: ${signature.slice(0, 30)}...`);

      // 2. Almacena en Blockchain (Llamada de Transacción)
      const timestamp = Math.floor(Date.now() / 1000); // Timestamp actual en segundos

      setLogMessage('⛓️ Enviando transacción a storeDocumentHash...');

      const tx = await documentRegistryContract.connect(signer).storeDocumentHash(
        hashBytes32,
        timestamp,
        signature
      );

      setLogMessage(`⛏️ Esperando confirmación de la transacción: ${tx.hash.slice(0, 30)}...`);

      // Esperar a que la transacción sea minada por Anvil
      const receipt = await tx.wait();

      setLogMessage(`🎉 Documento registrado con éxito en el bloque ${receipt.blockNumber} con ⛽ ${receipt.gasUsed.toString()} gas.`);

      // ** LÍNEA DE AUTOMATIZACIÓN (VERIFICAR AQUÍ) **
      setHashToConsult(documentHash);

    } catch (err: any) {
      console.error("Error en la firma o transacción:", err);
      setLogMessage(`❌ Error: ${err.reason || err.message || "Fallo desconocido"}`);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedWallet, documentRegistryContract, documentHash]);

  /**
 * 3. Consulta si el documento (hash) ya ha sido registrado
 */
  const handleCheckRegistry = useCallback(async () => {
    // La comprobación principal es que tengamos la instancia del contrato
    if (!documentRegistryContract) {
      setQueryLogMessage("⚠️ Error: Contrato no cargado.");
      return;
    }

    setQueryLogMessage('⏳ Consultando registro en blockchain...');
    setQueryResult(null); // Limpiamos resultados anteriores

    try {
      // 1. OBTENER UN SIGNER CONECTADO PARA FORZAR EL RECONOCIMIENTO DEL MÉTODO

      // Usamos la Wallet seleccionada si existe. Si no existe (es null),
      // usamos la instancia base del contrato, la cual tiene el Provider.
      // Esto resuelve el TypeError al asegurar que Ethers tenga un Signer/Runner.
      const connectedRunner = selectedWallet
        ? selectedWallet // Usamos el Signer
        : documentRegistryContract.runner; // Usamos el Provider del Contrato

      // Creamos la instancia CONECTADA. Esto fuerza el re-enlazamiento del ABI.
      const contractForQuery = documentRegistryContract.connect(connectedRunner);

      //const hashToQuery = DOCUMENT_HASH_BYTES32;  // ******** ELIMINAR *******
      const hashToQuery = hashToConsult;

      // Formateamos el hash a bytes32, ¡es crucial para la consulta!
      const hashBytes32Consult = zeroPadValue(hashToQuery, 32);

      // 2. LECTURA de la Blockchain (debería funcionar con la instancia conectada)
      const result = await contractForQuery.getDocumentInfo(hashBytes32Consult);

      if (result && result[0] !== ethers.ZeroAddress) {
        // El resultado es un array: [signer, timestamp, signature]
        setQueryResult({
          signer: result[0], // address
          signature: result[1], // string
          timestamp: result[2] // BigInt/string
        });
        setQueryLogMessage('✅ Registro encontrado. Ver detalles abajo.');
      } else {
        setQueryResult(null);
        setQueryLogMessage('🟡 Documento no encontrado o Hash inválido.');
      }

    } catch (err: any) {
      console.error("Error al consultar el registro:", err);
      // Usamos err.message porque es el que mejor se muestra en tu consola
      setQueryLogMessage(`❌ Error en la consulta: ${err.message || "Fallo desconocido"}`);
    }
  }, [documentRegistryContract, selectedWallet, hashToConsult]); // Mantenemos ambas dependencias

  // Renderiza el botón de selección de wallet
  const renderWalletSelector = () => (
    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-2">Seleccionar Wallet:</h3>
      {wallets.map((wallet: Wallet, index: number) => (
        <div
          key={wallet.address}
          onClick={() => selectWallet(index)}
          className={`p-2 my-1 cursor-pointer rounded-lg text-sm transition duration-150 ${selectedWallet?.address === wallet.address
            ? 'bg-indigo-100 border-indigo-500 font-bold text-indigo-700 border-2'
            : 'hover:bg-gray-100 border border-transparent'
            }`}
        >
          #{index + 1}: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </div>
      ))}
    </div>
  );

  return (
    <main className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-2xl border border-gray-300">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6 text-center">
        ETH Document Signer ✍️
      </h1>
      <hr className="mb-6" />

      <div className="p-4 bg-gray-50 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-700">
          1. Conexión y Selección de Wallet
        </h2>

        {/* Mensajes de Estado de Conexión */}
        {error && <p className="text-red-600 font-medium mb-2">🔴 ERROR: {error}</p>}

        {selectedWallet ? (
          <p className="text-green-600 font-medium break-words">
            ✅ Wallet Seleccionada: **{selectedWallet.address}**
          </p>
        ) : isConnected ? (
          <p className="text-yellow-600 font-medium">
            🟡 Conectado a Anvil. Por favor, selecciona una wallet.
          </p>
        ) : (
          <p className="text-red-500 font-medium">
            ⚠️ Desconectado. ¿Está Anvil corriendo?
          </p>
        )}

        {isConnected && wallets.length > 0 && renderWalletSelector()}
      </div>

      {/* SECCIÓN DE REGISTRO DE DOCUMENTO */}
      <div className="p-4 bg-blue-50 rounded-lg border-blue-200 border">
        <h2 className="text-xl font-semibold mb-3 text-blue-700">
          2. Registrar Documento en Blockchain
        </h2>

        {/* Campo de Carga de Archivo (NUEVA FUNCIONALIDAD) */}
        <div className="mb-4 p-4 border rounded-lg bg-white shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar y Cargar Archivo 📤
          </label>
          <input
            type="file"
            onChange={handleFileChange} // Llama a la nueva función
            className="block w-full text-sm text-gray-900 
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-100 file:text-blue-700
                       hover:file:bg-blue-200"
          />
          {/* Mostrar el nombre del archivo cargado (NUEVO ESTADO) */}
          {fileName && (
            <p className="mt-2 text-sm text-gray-600">
              Archivo cargado: <span className="font-bold text-blue-800">{fileName}</span>
            </p>
          )}
        </div>

        {/* Hash que se registrará (AHORA USA documentHash, que será calculado) */}
        <p className="text-sm font-mono p-2 bg-white rounded-md mb-4 break-words">
          **Hash a Registrar:** <span className='text-red-600 font-bold'>{documentHash}</span>
        </p>

        {/* Botón de Registro (MANTENEMOS SU BOTÓN) */}
        <button
          onClick={handleSignAndStore} // Usamos su función de firma
          disabled={!selectedWallet || isProcessing || documentHash === INITIAL_HASH_DISPLAY} // Usamos documentHash
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
        >
          {isProcessing ? 'Firmando y Registrando...' : 'Firmar y Registrar ✍️'}
        </button>

        {/* ... Mensajes de éxito y error aquí ... */}

      </div>

      {/* LOG DE MENSAJES */}
      {logMessage && (
        <p className={`p-2 mt-2 rounded-md font-medium text-sm break-words 
            ${logMessage.startsWith('❌') ? 'bg-red-200 text-red-800' :
            logMessage.startsWith('🎉') ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}
        >
          {logMessage}
        </p>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SECCIÓN DE CONSULTA DE DOCUMENTO (FASE 4) */}
      {/* ------------------------------------------------------------------- */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg border-gray-300 border">
        <h2 className="text-xl font-semibold mb-3 text-gray-700">
          3. Consultar Registro de Documento 🔎
        </h2>

        {/* Campo de entrada para el Hash a consultar */}
        <div className="mb-4">
          <label htmlFor="hashQuery" className="block text-sm font-medium text-gray-700 mb-1">
            Hash a Consultar:
          </label>
          {/* REEMPLAZAMOS EL PÁRRAFO FIJO POR EL INPUT CONTROLADO */}
          <input
            type="text"
            id="hashQuery"
            className="w-full p-2 border rounded-md font-mono text-sm break-words border-gray-300"
            placeholder="0x..."
            // ** VINCULACIÓN AL ESTADO hashToConsult **
            value={hashToConsult}
            onChange={(e) => setHashToConsult(e.target.value)}
          />
        </div>

        <button
          onClick={handleCheckRegistry} // ¡Ya conectado!
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
          disabled={hashToConsult === INITIAL_HASH_DISPLAY} // Deshabilitar si no hay hash válido
        >
          Verificar Registro
        </button>

        {/* ... (el resto del código de logs y queryResult permanece sin cambios) ... */}

        {queryLogMessage && (
          <p className={`p-2 mt-2 rounded-md font-medium text-sm break-words 
    ${queryLogMessage.startsWith('❌') ? 'bg-red-200 text-red-800' :
              queryLogMessage.startsWith('✅') ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}
          >
            {queryLogMessage}
          </p>
        )}

        {queryResult && (
          <div className="mt-4 p-3 bg-white border border-green-400 rounded-md">
            <p className="font-bold text-green-700 mb-2">✅ Documento Encontrado:</p>
            <p className="text-sm break-words">
              **Firmado por:** <span className="font-mono text-gray-800">{queryResult.signer}</span>
            </p>
            <p className="text-sm break-words">
              **Timestamp:** <span className="font-mono text-gray-800">{queryResult.timestamp.toString()}</span>
            </p>
            <p className="text-sm break-words mt-1">
              **Fecha y Hora Timestamp:** <span className="font-mono text-blue-700 font-bold">
                {formatTimestamp(queryResult.timestamp.toString())}</span>
            </p>
            <p className="text-sm break-words">
              **Firma (parcial):** <span className="font-mono text-gray-800">{queryResult.signature.toString().slice(0, 30)}...</span>
            </p>
            <p className="text-xs mt-2 text-gray-500">
              *(El Timestamp es la marca de tiempo de la Blockchain, no la fecha de hoy)*
            </p>
          </div>
        )}

      </div> {/* CIERRE DE LA SECCIÓN DE CONSULTA */}

      {/* ------------------------------------------------------------------- */}
      {/* SECCIÓN DE CONSULTA DE DOCUMENTO (FASE 4) */}
      {/* ------------------------------------------------------------------- */}
      {/*<div className="mt-6 p-4 bg-gray-100 rounded-lg border-gray-300 border">
        <h2 className="text-xl font-semibold mb-3 text-gray-700">
          3. Consultar Registro de Documento 🔎
        </h2>

        {/* Campo de entrada para el Hash a consultar */}
      {/*<div className="mb-4">
          <label htmlFor="hashQuery" className="block text-sm font-medium text-gray-700 mb-1">
            Hash a Consultar:
          </label>
          {/* Aquí usaremos el hash de prueba fijo por ahora */}
      {/*<p className="font-mono text-sm p-2 bg-white rounded-md border border-gray-300 break-words">
            {DOCUMENT_HASH_BYTES32}
          </p>
        </div>

        <button
          onClick={handleCheckRegistry} // ¡Ya conectado!
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
        >
          Verificar Registro
        </button>

        {/* NUEVO LOG DE CONSULTA */}
      {/*{queryLogMessage && (
          <p className={`p-2 mt-2 rounded-md font-medium text-sm break-words 
          ${queryLogMessage.startsWith('❌') ? 'bg-red-200 text-red-800' :
              queryLogMessage.startsWith('✅') ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}
          >
            {queryLogMessage}
          </p>
        )}

        {/* Aquí se mostrarán los resultados */}
      {/*{queryResult && (
          <div className="mt-4 p-3 bg-white border border-green-400 rounded-md">
            <p className="font-bold text-green-700 mb-2">✅ Documento Encontrado:</p>
            <p className="text-sm break-words">
              **Firmado por:** <span className="font-mono text-gray-800">{queryResult.signer}</span>
            </p>
            <p className="text-sm break-words">
              **Timestamp:** <span className="font-mono text-gray-800">{queryResult.timestamp.toString()}</span>
            </p>
            <p className="text-sm break-words mt-1">
              {/* 2. Muestra el valor FORMATEADO (la fecha legible) */}
      {/***Fecha y Hora Timestamp:** <span className="font-mono text-blue-700 font-bold">
                {formatTimestamp(queryResult.timestamp.toString())}</span>
            </p>
            <p className="text-sm break-words">
              **Firma (parcial):** <span className="font-mono text-gray-800">{queryResult.signature.toString().slice(0, 30)}...</span>
            </p>
            <p className="text-xs mt-2 text-gray-500">
              *(El Timestamp es la marca de tiempo de la Blockchain, no la fecha de hoy)*
            </p>
          </div>
        )}

      </div> {/* CIERRE DE LA SECCIÓN DE CONSULTA */}

    </main >
  );
}