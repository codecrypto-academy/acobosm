// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title DocumentRegistry
 * @dev Contrato para registrar hashes de documentos y sus firmas en Ethereum.
 */
contract DocumentRegistry {
    // Estructura para almacenar la información de cada documento firmado.
    struct DocumentInfo {
        address signer;     // Dirección que firmó el hash
        bytes signature;    // Firma digital ECDSA del hash
        uint256 timestamp;  // Momento Unix de la firma
    }

    // Mapeo: Hash del documento (bytes32) -> Información de la firma (DocumentInfo)
    mapping(bytes32 documentHash => DocumentInfo info) private documentRecords;

    // Evento que se emite cada vez que un documento es registrado.
    event DocumentRegistered(
        bytes32 indexed documentHash,
        address indexed signer,
        uint256 timestamp
    );

    /**
     * @notice Registra un hash de documento junto con su firma.
     * @dev Asumimos que la firma ya fue verificada fuera de la cadena (off-chain)
     * para ahorrar gas, o el front-end asegura que msg.sender es quien firma.
     * En la implementación usaremos msg.sender como el firmante.
     * * @param _documentHash Hash criptográfico del documento (ej. SHA-256)
     * @param _timestamp Momento Unix en que se realizó la firma
     * @param _signature Firma ECDSA generada por la wallet
     */
    function storeDocumentHash(
        bytes32 _documentHash,
        uint256 _timestamp,
        bytes calldata _signature
    ) public {
        // 1. Verificación: Asegurar que el documento no ha sido registrado antes.
        require(documentRecords[_documentHash].signer == address(0), "Doc ya registrado");

        /*
        // 2. Almacenamiento inicialmente sugerido
        documentRecords[_documentHash] = DocumentInfo(
            msg.sender,
            _signature,
            _timestamp
        );
        */

        // 2. Almacenamiento sugerido Después (Inicialización por nombre de campo)
        documentRecords[_documentHash] = DocumentInfo({
            signer: msg.sender,
            signature: _signature,
            timestamp: _timestamp
        });

        // 3. Emisión de Evento (para trazabilidad y Subgraphs)
        emit DocumentRegistered(_documentHash, msg.sender, _timestamp);
    }

    /**
     * @notice Obtiene la información de firma de un documento.
     * @param _documentHash Hash del documento.
     * @return signer Dirección que firmó.
     * @return signature Firma digital.
     * @return timestamp Momento de la firma.
     */
    function getDocumentInfo(
        bytes32 _documentHash
    ) public view returns (address signer, bytes memory signature, uint256 timestamp) {
        DocumentInfo storage info = documentRecords[_documentHash];
        
        // Retorna la data almacenada
        return (info.signer, info.signature, info.timestamp);
    }

    // NOTA CLAVE: La función 'verifyDocument' se implementará *fuera* de la cadena
    // (en el Frontend con Ethers.js) para maximizar la eficiencia de gas.
    // El Smart Contract solo almacena la "prueba de existencia y el firmante".
}