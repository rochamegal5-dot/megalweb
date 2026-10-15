# MegalWeb V2.1 - Gas ERP Seguro

## Migración a Vite + Vercel ENV

### 1. Configurar ENV en Vercel (ya hecho)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
Tipo: Config (no Secret) porque VITE_ es público

### 2. Local
```bash
npm install
cp .env.example .env
# editar .env con tus keys
npm run dev
```

### 3. Deploy
```bash
git add .
git commit -m "Migración a Vite + ENV seguro"
git push
# Vercel deploya automático y usa las ENV que configuraste
```

### Seguridad
- Antes: key hardcodeada en index.html -> cualquiera la ve en GitHub
- Ahora: key en Vercel ENV + import.meta.env -> nunca sube a GitHub
- Protección real: RLS en Supabase (ejecuta supabase_fix_final.sql)

### Próximos pasos
- Migrar tu index.html gigante por partes a src/modules/
- Cada módulo: productos.js, clientes.js, stock.js, ventas.js, gps.js
