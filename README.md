# IGLEICO – Distrito Sabana | Sistema de Gestión Eclesial, Actividades y Finanzas

Sistema web multi-rol diseñado para la **Iglesia Evangélica Interamericana de Colombia (IGLEICO) – Distrito Sabana**, que integra la gobernación distrital, las iglesias locales, fichas oficiales de pastores e iglesias, miembros, actividades con control de cartera/abonos, finanzas (diezmos, ofrendas, egresos y préstamos) y reportes oficiales en **PDF y Excel**.

## Módulos Incluidos

1. **Panel Principal (Dashboard):** KPIs en tiempo real, flujo financiero (últimos 6 meses), distribución de ingresos, actividades activas, saldos pendientes ("quién debe") y consolidado por iglesia.
2. **Actividades, Asistencia y Cartera:** Crea ventas pro-templo, rifas, congresos o actividades ministeriales; asigna miembros registrados o externos, qué se llevó cada persona, cuántos abonó, cuánto debe y registra abonos en 1 clic con sincronización automática a Finanzas.
3. **Finanzas y Diezmos:** Ingresos (diezmos vinculados a miembro o anónimos, ofrendas, recaudos de actividades, arriendos), egresos (emolumentos, servicios, arriendos, aportes distritales/nacionales) y cuentas por pagar / préstamos.
4. **Miembros / Congregación:** Directorio por iglesia y organismo interno (**UCEI, UDEI, UJEI, UNEI**) que alimenta automáticamente el Censo Poblacional Junta Nacional.
5. **Iglesias (Ficha Oficial IGLEICO):** Todos los campos del formato oficial (datos generales, local y propiedades, predial, vehículos, cuentas bancarias NIT IGLEICO, concilio, ministerios, profesionales, equipos, redes y Tabla 1 & Tabla 2 del Censo).
6. **Pastores y Familias (Ficha Oficial IGLEICO):** Hoja de vida ministerial (Reverendo/Pastor/Líder), contratos/emolumentos, estudios, cónyuge, hijos, condición de discapacidad y autorización Ley 1581 de 2012.
7. **Reportes Oficiales (PDF y Excel):** Financiero, Censo Junta Nacional, Cartera de Actividades y Directorio/Fichas individuales.
8. **Distrito Sabana (Gobernación):** Junta Distrital, Zonas del Distrito y gestión de usuarios multi-rol.

## Credenciales Iniciales de Prueba

| Rol | Usuario | Contraseña | Alcance |
|---|---|---|---|
| **Directiva Distrito Sabana (Admin)** | `distrito` | `sabana2026` | Ve y gestiona todo el Distrito Sabana |
| **Pastor Local – Iglesia El Redentor** | `elredentor` | `redentor2026` | Solo Iglesia El Redentor |
| **Tesorera Local – Iglesia El Redentor** | `tesoreria` | `tesoreria2026` | Solo Iglesia El Redentor |
| **Directiva Local – Betel Corozal** | `betel` | `betel2026` | Solo Iglesia Betel Corozal |

## Ejecución Local

Requisitos: **Node.js 22.13+ o 24+** (usa SQLite nativo integrado `node:sqlite`, sin necesidad de instalar motores externos).

```bash
npm install
npm run build
npm start
```

Abre en tu navegador: `http://localhost:4000`

Para desarrollo con recarga en vivo (Frontend Vite `:5173` + API `:4000`):

```bash
npm run dev
```

## Publicación en Internet (Nube)

El proyecto incluye `Dockerfile` listo para desplegar en **Render**, **Railway**, **Fly.io** o cualquier servidor VPS:
- Configura la variable de entorno `JWT_SECRET` con una clave segura.
- Monta un volumen persistente en `/app/data` (variable `DB_PATH=/app/data/distrito_sabana.sqlite`) para conservar la base de datos entre despliegues.
