# Celvis Reparaciones - Lista de precios

Página web estática preparada para GitHub Pages.

## Subir a GitHub

1. Crea un repositorio nuevo en GitHub.
2. Sube el archivo `index.html` a la raíz del repositorio.
3. Entra a **Settings > Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/root`.
6. Guarda los cambios.

## Editar WhatsApp

Dentro de `index.html`, busca:

```js
const WHATSAPP_NUMBER = "18090000000";
```

Sustituye ese número por el tuyo, sin espacios, signos ni guiones.

## Editar precios

Busca la sección:

```js
const repairData = [
```

Cada modelo contiene sus servicios, precios y garantía.
