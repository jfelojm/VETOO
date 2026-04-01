# Turnapp — Guía de instalación y configuración

## ¿Qué es esto?
Este es el código fuente completo de Turnapp, plataforma de reservas online para negocios de belleza y bienestar.
Sigue esta guía paso a paso. Cada sección indica si la hace **tú** o si está **lista en el código**.

---

## PARTE 1 — Instalar herramientas en tu computadora

> Solo haces esto una vez.

### 1.1 Instalar Node.js
1. Ve a https://nodejs.org
2. Descarga la versión **LTS** (la recomendada)
3. Instálala con todos los valores por defecto
4. Para verificar: abre una terminal y escribe `node --version` → debe mostrar algo como `v20.x.x`

### 1.2 Instalar Cursor (tu editor de código con IA)
1. Ve a https://cursor.com
2. Descárgalo e instálalo
3. Al abrirlo, inicia sesión con tu cuenta de GitHub (o crea una gratis en github.com)
4. En Cursor, ve a Settings → Models → conecta tu cuenta de Claude (usa el mismo email de Claude Pro)

### 1.3 Instalar Git
1. Ve a https://git-scm.com
2. Descarga e instala para tu sistema operativo

---

## PARTE 2 — Configurar los servicios externos

> Necesitas crear cuentas gratuitas en estos servicios. Todos tienen free tier.

### 2.1 Supabase (base de datos)
1. Ve a https://supabase.com y crea una cuenta gratis
2. Crea un nuevo proyecto (botón verde "New project")
3. Elige un nombre (ej: "barberapp"), una contraseña fuerte, y la región más cercana (us-east-1 o similar)
4. Espera ~2 minutos mientras se crea
5. Ve a **Settings → API**
6. Copia estos tres valores en tu `.env.local`:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 2.2 Ejecutar la base de datos
1. En Supabase, ve a **SQL Editor**
2. Haz clic en **"New query"**
3. Abre el archivo `supabase/migrations/001_schema_inicial.sql` de este proyecto
4. Copia todo el contenido y pégalo en el editor de Supabase
5. Haz clic en **"Run"** (botón verde)
6. Debe decir "Success. No rows returned" — eso es correcto

### 2.3 Configurar Auth en Supabase
1. En Supabase ve a **Authentication → URL Configuration**
2. En "Site URL" escribe: `http://localhost:3000` (para desarrollo)
3. En "Redirect URLs" agrega: `http://localhost:3000/api/auth/callback`
4. Más adelante cuando tengas dominio, agrega también los URLs de producción

### 2.4 Stripe (pagos de suscripción)
1. Ve a https://stripe.com y crea una cuenta
2. Activa el **modo de prueba** (test mode) — el interruptor arriba a la derecha
3. Ve a **Developers → API keys**
4. Copia:
   - `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY`
5. Ve a **Products → Add product** y crea 3 productos:
   - "Plan Básico" → precio recurrente $20/mes → copia el `price_id` → `STRIPE_PRICE_BASIC`
   - "Plan Pro" → precio recurrente $40/mes → copia el `price_id` → `STRIPE_PRICE_PRO`
   - "Plan Premium" → precio recurrente $80/mes → copia el `price_id` → `STRIPE_PRICE_PREMIUM`

### 2.5 Resend (emails transaccionales)
1. Ve a https://resend.com y crea una cuenta gratis (3,000 emails/mes gratis)
2. Ve a **API Keys → Create API Key**
3. Copia la clave → `RESEND_API_KEY`
4. En `RESEND_FROM_EMAIL` puedes poner `onboarding@resend.dev` para pruebas

---

## PARTE 3 — Abrir el proyecto en Cursor y ejecutarlo

### 3.1 Abrir el proyecto
1. Abre Cursor
2. File → Open Folder → selecciona la carpeta `barberapp`

### 3.2 Crear el archivo de variables de entorno
1. En Cursor, en el explorador de archivos (izquierda), haz clic derecho en la raíz
2. "New File" → nombra el archivo `.env.local`
3. Copia el contenido de `.env.example` y pega todos tus valores reales

### 3.3 Instalar dependencias
1. En Cursor, abre la terminal: **Terminal → New Terminal**
2. Escribe y presiona Enter:
```
npm install
```
3. Espera unos minutos mientras descarga todo

### 3.4 Ejecutar el proyecto
```
npm run dev
```
4. Abre tu navegador en: **http://localhost:3000**
5. ¡Deberías ver la landing page de Turnapp!

---

## PARTE 4 — Configurar Stripe Webhooks (para que los pagos funcionen)

> El webhook es lo que le dice a tu app "este negocio pagó, actívalo".

### En desarrollo (tu computadora):
1. Instala la CLI de Stripe: https://stripe.com/docs/stripe-cli
2. Ejecuta:
```
stripe listen --forward-to localhost:3000/api/suscripcion/webhook
```
3. Copia el `webhook signing secret` que aparece → `STRIPE_WEBHOOK_SECRET`

### En producción (Vercel):
1. En Stripe → Developers → Webhooks → Add endpoint
2. URL: `https://tudominio.com/api/suscripcion/webhook`
3. Eventos a escuchar:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copia el signing secret → agrega como variable en Vercel

---

## PARTE 5 — Deploy en Vercel (publicar en internet)

### 5.1 Subir el código a GitHub
1. Ve a https://github.com → New repository → nombre: "barberapp" → Create
2. En la terminal de Cursor:
```
git init
git add .
git commit -m "primer commit"
git remote add origin https://github.com/TU_USUARIO/barberapp.git
git push -u origin main
```

### 5.2 Conectar con Vercel
1. Ve a https://vercel.com → Sign up con tu cuenta de GitHub
2. "Add New Project" → importa tu repositorio `barberapp`
3. En la sección "Environment Variables", agrega TODAS las variables de `.env.local`
4. Haz clic en "Deploy"
5. En 2-3 minutos tendrás tu app en `https://barberapp-tuusuario.vercel.app`

### 5.3 Dominio personalizado
1. Compra tu dominio en Namecheap o GoDaddy (~$12/año)
2. En Vercel → tu proyecto → Settings → Domains → agrega tu dominio
3. Sigue las instrucciones de Vercel para apuntar los DNS

---

## LO QUE HACE CLAUDE (yo) VS LO QUE HACES TÚ

| Tarea | Quién |
|-------|-------|
| Todo el código de la app | ✅ Claude |
| Crear cuenta en Supabase | 👤 Tú |
| Ejecutar el SQL de la DB | 👤 Tú |
| Crear cuenta en Stripe | 👤 Tú |
| Crear los 3 productos en Stripe | 👤 Tú |
| Crear cuenta en Resend | 👤 Tú |
| Instalar Node.js y Cursor | 👤 Tú |
| Crear archivo .env.local | 👤 Tú |
| Ejecutar `npm install` | 👤 Tú |
| Subir a GitHub y Vercel | 👤 Tú (con mi guía) |
| Futuros cambios y mejoras | ✅ Claude en Cursor |

---

## ESTRUCTURA DEL PROYECTO

```
barberapp/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Landing page pública
│   │   ├── auth/
│   │   │   ├── login/            ← Inicio de sesión
│   │   │   └── register/         ← Registro de barbería
│   │   ├── dashboard/
│   │   │   ├── layout.tsx        ← Sidebar y nav del panel
│   │   │   ├── page.tsx          ← Agenda del día
│   │   │   └── ajustes/          ← Configuración del negocio
│   │   ├── reservar/[slug]/      ← Página pública de reservas
│   │   └── api/
│   │       ├── reservas/         ← Crear reservas + slots disponibles
│   │       ├── auth/             ← Login/logout/callback
│   │       └── suscripcion/      ← Webhooks de Stripe
│   ├── components/
│   │   └── booking/
│   │       └── BookingFlow.tsx   ← Flujo de 5 pasos para reservar
│   ├── lib/
│   │   ├── supabase/             ← Clientes de DB
│   │   ├── stripe.ts             ← Config de pagos
│   │   ├── emails.ts             ← Envío de emails
│   │   └── utils.ts              ← Funciones de utilidad
│   └── types/index.ts            ← Tipos de TypeScript
└── supabase/
    └── migrations/               ← SQL de la base de datos
```

---

## PRÓXIMOS SPRINTS (lo que viene)

- **Sprint 2**: Sección de barberos y servicios en el panel, recordatorios automáticos
- **Sprint 3**: Gestión completa de reservas, bloqueo de horas, reportes
- **Sprint 4**: Integración completa de Stripe para suscripciones desde el panel
- **Sprint 5**: Landing page final, onboarding, PWA para móvil

---

## COMANDOS ÚTILES

```bash
npm run dev        # Ejecutar en desarrollo
npm run build      # Verificar que todo compila bien
npm run lint       # Revisar errores de código
```

---

## ¿ALGO NO FUNCIONA?

Abre Cursor y en el chat de Claude escribe:
> "Tengo este error: [pega el error] ¿cómo lo soluciono?"

Claude leerá tu código y te dará la solución exacta.
