/* LABORATORIO: implementar la persistencia con IndexedDB.
   Contrato sugerido:
   guardarEnDB(visita) -> Promise con el ID generado
   obtenerVisitasDB() -> Promise con un arreglo de visitas
   eliminarDeDB(id) -> Promise al completar eliminación
   Cada visita: {descripcion, foto, latitud, longitud, fecha}.
   La fotografía puede almacenarse como Blob o Data URL.
*/

// Nombre y versión de la base de datos IndexedDB
const DB_NAME = "VisitasDB";
const DB_VERSION = 1;
const STORE_NAME = "visitas";

/**
 * Abre y/o inicializa la base de datos IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function abrirDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Se ejecuta al crear la BD o subir de versión
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Crear el almacén de objetos con autoIncrement para el id
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = (e) => {
      resolve(e.target.result);
    };

    request.onerror = (e) => {
      console.error("Error al abrir IndexedDB:", e.target.error);
      reject(e.target.error);
    };
  });
}

/**
 * Guardar un objeto de visita en la base de datos
 * @param {Object} visita Objeto con { descripcion, fotografia, coordenadas, fecha }
 * @returns {Promise<number>} ID asignado al nuevo registro
 */
async function guardarEnDB(visita) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(visita);

    request.onsuccess = (e) => {
      resolve(e.target.result); // Retorna el id generado
    };

    request.onerror = (e) => {
      console.error("Error al guardar en IndexedDB:", e.target.error);
      reject(e.target.error);
    };
  });
}

/**
 * Obtener la lista completa de visitas almacenadas
 * @returns {Promise<Array>} Lista de registros
 */
async function obtenerVisitasDB() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = (e) => {
      resolve(e.target.result || []);
    };

    request.onerror = (e) => {
      console.error("Error al consultar IndexedDB:", e.target.error);
      reject(e.target.error);
    };
  });
}

/**
 * Eliminar un registro de visita por su ID
 * @param {number|string} id Identificador de la visita a eliminar
 * @returns {Promise<void>}
 */
async function eliminarDeDB(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    // Convertir el ID a número en caso de que llegue como string
    const idNumerico = Number(id);
    const request = store.delete(idNumerico);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (e) => {
      console.error("Error al eliminar registro de IndexedDB:", e.target.error);
      reject(e.target.error);
    };
  });
}