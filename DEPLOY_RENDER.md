# Deploy en Render (sin MySQL externo)

Este proyecto queda listo para publicar con Blueprint y DB administrada por Render.

## 1) Subir a GitHub

1. Crea un repo nuevo en GitHub.
2. Sube todo el proyecto (sin .env, porque esta en .gitignore).

## 2) Crear servicio en Render

1. En Render, elige New + Web Service.
2. Conecta tu repo.
3. Render detecta render.yaml automaticamente.
4. Render crea automaticamente la base PostgreSQL definida en `render.yaml`.
5. Solo debes completar:
   - ADMIN_USERNAME
   - ADMIN_PASSWORD

## 3) Verificacion

- URL publica principal: https://tu-servicio.onrender.com/
- Salud API: https://tu-servicio.onrender.com/api/health
- Admin: https://tu-servicio.onrender.com/admin.html (pedira usuario/password si definiste ADMIN_USERNAME y ADMIN_PASSWORD)

## 4) Uso real

- Tus productos se guardan en la DB administrada por Render.
- Clientes veran los mismos productos desde cualquier dispositivo.
- El panel admin actualiza el mismo catalogo compartido.

## Notas

- Si no defines ADMIN_USERNAME y ADMIN_PASSWORD, admin queda abierto.
- Mantener siempre el servicio online para que la web responda.
