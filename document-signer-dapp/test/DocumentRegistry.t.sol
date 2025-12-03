// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test, console2} from "forge-std/Test.sol";
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
    uint256 public timestamp1 = block.timestamp;  // ******* AL PARECER NO ESTÁ TOMANDO ADECUADAMETNE EL TIMESTAMP ANTES DE REALIZAR EL setUp( ) *******
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
        // Usamos vm.startPrank para simular la llamada desde la dirección del firmante (signer1)
        vm.startPrank(signer1);

        // Verificación de eventos (muy importante en dApps)  //*******NO ME QUEDA CLARO LA RELACION ENTRE EL EVENTO Y ESTE EXPECTEMIT*******
        // Le dice a Forge: "Espera encontrar este evento exactamente antes de la siguiente transacción."
        /*
        vm.expectEmit(
            bool checkTopic1, // ¿Comprobar el primer argumento indexado?
            bool checkTopic2, // ¿Comprobar el segundo argumento indexado?
            bool checkTopic3, // ¿Comprobar el tercer argumento indexado?
            bool checkData,   // ¿Comprobar los argumentos NO indexados?
            address emitter   // Dirección del contrato que emite
        );
        */
        vm.expectEmit(true, true, false, true, address(registry));

        emit DocumentRegistered(documentHash1, signer1, timestamp1);   // *******SE HACE EL CAMBIO DE TIMESTAMP *******
        //emit DocumentRegistered(documentHash1, signer1, timestamp);  // ******* SE VUELVE Y REGRESA EL TIMESTAMP *******
        
        // Llamar a la función
        registry.storeDocumentHash(documentHash1, timestamp1, signature1);
        
        // Detener la simulación de la dirección
        vm.stopPrank();

        // Verificación (Assertion)
        // Obtenemos la información y verificamos que coincida.
        (address signer, bytes memory signature, uint256 timestamp) = registry.getDocumentInfo(documentHash1);

        // Assertions:
        assertEq(signer, signer1, "El firmante registrado no coincide");
        assertEq(timestamp, timestamp1, "El timestamp no coincide");
        assertEq(signature, signature1, "La firma registrada no coincide");
        
        
    }

    // TEST 2: Intentar registrar el mismo documento dos veces (Caso de Error)
    function testStoreDocumentAlreadyExists() public {
        // Primero, registramos el documento de manera exitosa
        vm.startPrank(signer1);
        registry.storeDocumentHash(documentHash1, timestamp1, signature1);
        vm.stopPrank();

        // 1. Intentar registrar el mismo hash con otra dirección (signer2)
        vm.startPrank(signer2);
        
        // 2. Usamos vm.expectRevert para asegurar que el contrato rechaza la transacción
        vm.expectRevert("Doc ya registrado");
        registry.storeDocumentHash(documentHash1, timestamp1, signature1);
        
        vm.stopPrank();

        // Verificamos que la información original no haya cambiado
        (address signer, , ) = registry.getDocumentInfo(documentHash1);
        assertEq(signer, signer1, "La informacion del firmante fue sobreescrita");
    }
}