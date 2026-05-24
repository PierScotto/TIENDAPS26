# Deploy en Render + MySQL

Este proyecto queda listo para publicar como un solo servicio web Node.js.

## 1) Subir a GitHub

1. Crea un repo nuevo en GitHub.
2. Sube todo el proyecto (sin .env, porque esta en .gitignore).

## 2) Crear MySQL en la nube

Puedes usar Railway, Aiven, PlanetScale (MySQL compatible), o un VPS con MySQL.
Necesitas estos datos:

- MYSQL_HOST
- MYSQL_PORT
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_DATABASE

## 3) Crear servicio en Render

1. En Render, elige New + Web Service.
2. Conecta tu repo.
3. Render detecta render.yaml automaticamente.
4. En Environment, carga estas variables:
   - MYSQL_HOST
   - MYSQL_PORT
   - MYSQL_USER
   - MYSQL_PASSWORD
   - MYSQL_DATABASE
   - ADMIN_USERNAME
   - ADMIN_PASSWORD

## 4) Verificacion

- URL publica principal: https://tu-servicio.onrender.com/
- Salud API: https://tu-servicio.onrender.com/api/health
- Admin: https://tu-servicio.onrender.com/admin.html (pedira usuario/password si definiste ADMIN_USERNAME y ADMIN_PASSWORD)

## 5) Uso real

- Tus productos se guardan en MySQL.
- Clientes veran los mismos productos desde cualquier dispositivo.
- El panel admin actualiza el mismo catalogo compartido.

## Notas

- Si no defines ADMIN_USERNAME y ADMIN_PASSWORD, admin queda abierto.
- Mantener siempre el servicio online para que la web responda.
