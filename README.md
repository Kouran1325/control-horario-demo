PROYECTO: CONTROL HORARIO

Estructura de entrega:

control-horario/
│
├── backend/
│   Código fuente de la API backend.
│   Tecnologías principales:
│   - Next.js
│   - TypeScript
│   - Prisma ORM
│   - PostgreSQL
│
├── frontend/
│   Código fuente de la aplicación cliente.
│   Tecnologías principales:
│   - Angular
│   - TypeScript
│   - CSS Responsive
│
├── documentacion/
│   - Libro_Backend.pdf
│   - Libro_Frontend.pdf
│   - Guia_Usuario.pdf
│
└── README.txt


DESCRIPCIÓN GENERAL

Control Horario es una aplicación orientada al registro de jornada laboral,
permitiendo a los usuarios iniciar y finalizar fichajes, consultar resúmenes
de actividad y gestionar su perfil.

Además, dispone de una zona administrativa para la gestión de usuarios,
control de fichajes, auditoría y exportación de datos.


FUNCIONALIDADES PRINCIPALES

USUARIO:
- Inicio de sesión
- Registro
- Fichaje de entrada y salida
- Geolocalización opcional
- Consulta de resúmenes
- Exportación PDF / CSV
- Gestión de perfil
- Cambio de contraseña
- Avatar de usuario

ADMINISTRADOR:
- Gestión de usuarios
- Activación / desactivación
- Cambio de roles
- Creación manual de usuarios
- Gestión avanzada de fichajes
- Cierre forzado de fichajes
- Auditoría del sistema
- Exportaciones


DOCUMENTACIÓN INCLUIDA

1. Guia_Usuario.pdf
   Manual práctico de uso de la aplicación.

2. Libro_Frontend.pdf
   Explicación técnica de la parte visual y cliente.

3. Libro_Backend.pdf
   Explicación técnica de API, seguridad y base de datos.


PUESTA EN MARCHA (ENTORNO LOCAL)

BACKEND:

1. Acceder a carpeta backend
2. Instalar dependencias:
   npm install

3. Configurar variables de entorno (.env)

4. Ejecutar:
   npm run dev


FRONTEND:

1. Acceder a carpeta frontend
2. Instalar dependencias:
   npm install

3. Ejecutar:
   ng serve


URLS HABITUALES

Frontend:
http://localhost:4200

Backend:
http://localhost:3000


CUENTA DEMO (si procede)

Administrador:
Email: admin@demo.com
Password: 12345

(Modificar según entorno real)


NOTAS FINALES

Proyecto desarrollado con enfoque práctico y arquitectura separada
frontend/backend, aplicando medidas de seguridad, control de acceso,
responsive design y documentación técnica.