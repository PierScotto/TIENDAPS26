# NovaTech Store

Tienda web moderna para venta de productos electrónicos con estética premium, tonos oscuros y acentos cian/azules.

## Incluye

- Hero comercial inspirado en tiendas de tecnología de alto tráfico.
- Categorías rápidas: PC, notebooks, TVs, smartphones, gaming y audio.
- Búsqueda en tiempo real.
- Carrito lateral interactivo.
- Sección de marcas, promociones y newsletter.
- Diseño responsive.
- Panel simple para cargar productos con nombre, categoría, precio e imagen.

## Referencia visual

La estructura toma como referencia la lógica comercial de la tienda indicada por el usuario: categorías muy visibles, promociones destacadas, marcas, newsletter y foco en conversión.

## Stack usado

- HTML5
- CSS3
- JavaScript vanilla
- Tipografías modernas desde Google Fonts

## Backend real con base de datos

Esta version funciona con persistencia real en DB.

- Local: MySQL (variables `MYSQL_*`).
- Render: PostgreSQL administrado automaticamente (variable `DATABASE_URL`).

Archivos clave:

- `server.js`: API REST con Express.
- `db/schema.sql`: esquema para entorno local MySQL.
- `.env.example`: variables para entorno local y seguridad admin.
- `app.js`: mantiene fallback local y sincroniza con `/api/products` y `/api/leads`.

### 1) Local: crear base de datos en DBeaver (opcional)

Ejecuta el script completo de `db/schema.sql` si vas a correr local con MySQL.

### 2) Configurar entorno local

Crear archivo `.env` en la raiz, basado en `.env.example`:

```env
PORT=3000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=tu_password
MYSQL_DATABASE=novatech_store
```

### 3) Instalar dependencias y ejecutar

```bash
npm install
npm start
```

La app queda en:

- `http://localhost:3000/`
- `http://localhost:3000/admin.html`

API disponible:

- `GET /api/health`
- `GET /api/products`
- `PUT /api/products`
- `POST /api/leads`

En Render el servicio usa PostgreSQL automaticamente (definido en `render.yaml`), sin necesidad de cargar `MYSQL_HOST` manualmente.

### Seguridad admin en produccion

Si defines estas variables, el panel admin y la edicion del catalogo quedan protegidos con usuario/password:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Sin esas variables, el admin queda abierto.

### Deploy publico

Para publicar y compartir con clientes, sigue la guia en `DEPLOY_RENDER.md`.

## Formato de subida

Cada producto usa una estructura simple:

```json
{
	"name": "Notebook Ultra 14\" OLED",
	"category": "notebook",
	"tag": "TOP",
	"price": 1299,
	"image": "https://tusitio.com/imagen.jpg"
}
```

En esta version podés cargar imagenes desde el formulario y los productos se guardan en MySQL cuando el backend esta activo.

## Abrir

Modo recomendado (con MySQL):

- `npm start`
- abrir `http://localhost:3000/`

Modo fallback (sin backend):

- abrir `index.html` y sigue funcionando con localStorage.
