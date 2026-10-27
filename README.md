# Laboratorio PWA: Registro de visitas
**Autoría:** M.Sc. Olivier Blanco Sandí

## Incluye
Interfaz adaptable, estilos, manifiesto, iconos, Service Worker y eventos conectados a funciones pendientes. **La lógica del laboratorio NO está implementada.** No se usa Firebase ni backend.

## Implementar
1. `tomarFoto()` y lectura de `#inputFoto`: captura y vista previa.
2. `obtenerUbicacion()`: geolocalización y enlace a Google Maps.
3. `guardarEnDB()`, `obtenerVisitasDB()`, `eliminarDeDB()`: IndexedDB.
4. `guardarVisita()`, `cargarVisitas()`, `eliminarVisita()`: registro y consulta.
5. `compartirVisita()`: Web Share API, compartiendo descripción y enlace de Maps.

## Ejecutar localmente
Servir la carpeta con un servidor HTTP local (por ejemplo Live Server de VS Code). No abrir `index.html` con `file://`. Probar cámara/GPS en `localhost` o HTTPS y aceptar permisos. La cámara se puede implementar con el input de archivo `capture` ya incluido; su comportamiento depende del dispositivo.

## Publicar en Netlify
1. Acceder a https://app.netlify.com/ e iniciar sesión.
2. Crear un sitio mediante **Deploy manually / drag and drop** (la etiqueta puede variar).
3. Arrastrar la **carpeta pwa-visitas** (que contiene `index.html` en su raíz) al área de despliegue.
4. Abrir la URL `https://...netlify.app` desde un teléfono y probar cámara, GPS, almacenamiento, compartir e instalación.
5. Abrir el sitio una vez con conexión, luego probar el funcionamiento offline. Los registros se guardan solo en el navegador/dispositivo donde fueron creados.

## Notas
- `navigator.share()` requiere interacción del usuario, HTTPS y compatibilidad del navegador. Compartir fotografía es opcional; compartir descripción y URL de Maps es suficiente.
- IndexedDB permite guardar fotografías, pero conviene reducir su tamaño para evitar problemas de almacenamiento.
- El Service Worker guarda los recursos estáticos; **no** sincroniza registros entre dispositivos.
- Tras modificar `sw.js` o archivos cacheados, incrementar la constante `CACHE` y recargar para actualizar la versión instalada.
- No registrar ubicaciones ni imágenes de otras personas sin su autorización.
