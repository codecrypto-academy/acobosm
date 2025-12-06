// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {DocumentRegistry} from "../src/DocumentRegistry.sol";

contract DocumentRegistryTest is Test {
    DocumentRegistry public registry;
    
    // Declaracion del evento que se emite cada vez que un documento es registrado
    event DocumentRegistered(
        bytes32 indexed documentHash,
        address indexed signer,
        uint256 timestamp
    );
    
    // Variables de prueba (Mock Data)
    bytes32 public documentHash1 = keccak256(abi.encodePacked("documento de prueba 1"));
    bytes32 public documentHash2 = keccak256(abi.encodePacked("documento de prueba 2"));
    bytes32 public documentHash3 = keccak256(abi.encodePacked("documento de prueba 3")); // Nuevo Hash
    //uint256 public timestamp1 = block.timestamp;  // ******* AL PARECER NO ESTÁ TOMANDO ADECUADAMETNE EL TIMESTAMP ANTES DE REALIZAR EL setUp( ) *******
    bytes public signature1 = hex"1c3501"; // Firma de prueba (no válida criptográficamente, solo para almacenamiento)
    
    // Direcciones de prueba
    address public signer1 = makeAddr("andres_san_wallet");
    address public signer2 = makeAddr("checo_perez_fan");

    // Función que se ejecuta ANTES de cada prueba
    function setUp() public {
        // Despliega una nueva instancia del contrato DocumentRegistry antes de cada test.
        registry = new DocumentRegistry();
    }

    // TEST 1: Verificar el registro exitoso de un documento (Happy Path)
    function testStoreDocumentSuccess() public {
        uint256 currentTimestamp = block.timestamp; // <--- Generamos el timestamp justo antes
        
        // Usamos vm.startPrank para simular la llamada desde la dirección del firmante (signer1)
        vm.startPrank(signer1);

        // Verificación de eventos (muy importante en dApps)  
        // Le dice a Forge: "Espera encontrar este evento exactamente antes de la siguiente transacción."
        vm.expectEmit(true, true, false, true, address(registry));

        emit DocumentRegistered(documentHash1, signer1, currentTimestamp);   // ******* SE MEJORA EL MANEJO DE TIMESTAMP *******
        //emit DocumentRegistered(documentHash1, signer1, timestamp1);   // *******SE HACE EL CAMBIO DE TIMESTAMP *******
        //emit DocumentRegistered(documentHash1, signer1, timestamp);  // ******* SE VUELVE Y REGRESA EL TIMESTAMP *******
        
        // Llamar a la función
        registry.storeDocumentHash(documentHash1, currentTimestamp, signature1);
        //registry.storeDocumentHash(documentHash1, timestamp1, signature1);   // ******* SE USABA CON EL VIEJO timestamp1 *******
        
        // Detener la simulación de la dirección
        vm.stopPrank();

        // Verificación (Assertion)
        // Obtenemos la información y verificamos que coincida.
        (address signer, bytes memory signature, uint256 timestamp) = registry.getDocumentInfo(documentHash1);

        // Assertions:
        assertEq(signer, signer1, "El firmante registrado no coincide");
        assertEq(timestamp, currentTimestamp, "El timestamp no coincide");
        //assertEq(timestamp, timestamp1, "El timestamp no coincide");   // ******* ASSERTEQ CON EL timestamp1 VIEJO *******
        assertEq(signature, signature1, "La firma registrada no coincide");
        
        
    }

    // TEST 2: Intentar registrar el mismo documento dos veces (Caso de Error)
    function testStoreDocumentAlreadyExists() public {
        uint256 currentTimestamp = block.timestamp;
        
        // Primero, registramos el documento de manera exitosa
        vm.startPrank(signer1);
        registry.storeDocumentHash(documentHash1, currentTimestamp, signature1);
        //registry.storeDocumentHash(documentHash1, timestamp1, signature1);   // ******* CUANDO SE USABA EL timestamp1 VIEJO *******
        vm.stopPrank();

        // 1. Intentar registrar el mismo hash con otra dirección (signer2)
        vm.startPrank(signer2);
        
        // 2. Usamos vm.expectRevert para asegurar que el contrato rechaza la transacción
        vm.expectRevert("Doc ya registrado");
        registry.storeDocumentHash(documentHash1, currentTimestamp, signature1);
        //registry.storeDocumentHash(documentHash1, timestamp1, signature1);   // ******* CUANDO SE USABA EL timestamp1 VIEJO *******
        vm.stopPrank();

        // Verificamos que la información original no haya cambiado
        (address signer, , ) = registry.getDocumentInfo(documentHash1);
        assertEq(signer, signer1, "La informacion del firmante fue sobreescrita");
    }

    // TEST 3: Búsqueda General - Verificar que se listan todos los hashes
    function testGetAllDocumentHashes() public {
        // Registro 1 (signer1)
        vm.prank(signer1);
        registry.storeDocumentHash(documentHash1, 101, hex"1111");

        // Registro 2 (signer2)
        vm.prank(signer2);
        registry.storeDocumentHash(documentHash2, 102, hex"2222");

        // Registro 3 (signer1)
        vm.prank(signer1);
        registry.storeDocumentHash(documentHash3, 103, hex"3333");

        // Verificación de la BÚSQUEDA GENERAL
        bytes32[] memory allHashes = registry.getAllDocumentHashes();

        assertEq(allHashes.length, 3, "Debe haber 3 documentos registrados globalmente");
        assertEq(allHashes[0], documentHash1, "Primer hash debe ser documentHash1");
        assertEq(allHashes[1], documentHash2, "Segundo hash debe ser documentHash2");
        assertEq(allHashes[2], documentHash3, "Tercer hash debe ser documentHash3");
    }

    // TEST 4: Búsqueda por Wallet - Verificar que se listan solo los hashes de un firmante
    function testGetDocumentsBySigner() public {
        // Registro 1 (signer1)
        vm.prank(signer1);
        registry.storeDocumentHash(documentHash1, 101, hex"1111");

        // Registro 2 (signer2)
        vm.prank(signer2);
        registry.storeDocumentHash(documentHash2, 102, hex"2222");

        // Registro 3 (signer1)
        vm.prank(signer1);
        registry.storeDocumentHash(documentHash3, 103, hex"3333");

        // 1. Verificar los documentos de signer1
        bytes32[] memory signer1Hashes = registry.getDocumentsBySigner(signer1);
        //bytes32[] memory signer1Hashes = registry.signerDocuments(signer1);   // ******* CUANDO SE USABA EL GETTER AUTOMATICO *******
        
        assertEq(signer1Hashes.length, 2, "signer1 debe tener 2 documentos");
        assertEq(signer1Hashes[0], documentHash1, "Primer hash de signer1 debe ser documentHash1");
        assertEq(signer1Hashes[1], documentHash3, "Segundo hash de signer1 debe ser documentHash3");

        // 2. Verificar los documentos de signer2
        bytes32[] memory signer2Hashes = registry.getDocumentsBySigner(signer2);
        //bytes32[] memory signer2Hashes = registry.signerDocuments(signer2);   // ******* CUANDO SE USABA EL GETTER AUTOMATICO *******
        
        assertEq(signer2Hashes.length, 1, "signer2 debe tener 1 documento");
        assertEq(signer2Hashes[0], documentHash2, "Hash de signer2 debe ser documentHash2");

        // 3. Verificar una wallet sin registros
        bytes32[] memory emptyHashes = registry.getDocumentsBySigner(address(0x999));
        //bytes32[] memory emptyHashes = registry.signerDocuments(address(0x999));   // ******* CUANDO SE USABA EL GETTER AUTOMATICO *******
        assertEq(emptyHashes.length, 0, "Una wallet sin registros debe retornar un array vacio");
    }

    // TEST 5: Rechazar documentos inexistentes / Obtener valores por defecto.
    function testDocumentNotExists() public view {
        bytes32 unknownHash = keccak256(abi.encodePacked("hash-inexistente"));

        // Obtenemos la información de un hash que NO se ha registrado.
        (address signer, bytes memory signature, uint256 timestamp) = registry.getDocumentInfo(unknownHash);

        // Assertions: Para un documento inexistente, el 'signer' (address) debe ser cero.
        assertEq(signer, address(0), "El firmante de un hash inexistente debe ser address(0)");
        assertEq(timestamp, 0, "El timestamp de un hash inexistente debe ser cero");
        assertEq(signature.length, 0, "La firma de un hash inexistente debe ser un array vacio");
    }
}