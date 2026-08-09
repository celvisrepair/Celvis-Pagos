# Celvis Reparaciones PWA

Sube **todo el contenido de esta carpeta** a la raíz de tu repositorio de GitHub Pages:

- index.html
- manifest.webmanifest
- service-worker.js
- carpeta icons/

## Instalar en iPhone

1. Abre la página publicada en **Safari**.
2. Toca el botón **Compartir**.
3. Selecciona **Añadir a pantalla de inicio**.
4. Confirma el nombre “Celvis”.

La app abrirá en modo independiente, sin la barra normal de Safari.

## Nota sobre actualizaciones

Si luego modificas mucho la página y el iPhone sigue mostrando una versión anterior,
cambia en `service-worker.js`:

`celvis-precios-v1`

por:

`celvis-precios-v2`

y vuelve a subir los archivos.
