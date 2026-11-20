import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { activitiesRouter } from './routes/activities.routes';
import { authRouter } from './routes/auth.routes';
import { churchesRouter } from './routes/churches.routes';
import { districtRouter } from './routes/district.routes';
import { financeRouter } from './routes/finance.routes';
import { membersRouter } from './routes/members.routes';
import { pastorsRouter } from './routes/pastors.routes';
import { reportsRouter } from './routes/reports.routes';
import { seedIfEmpty } from './seed';

seedIfEmpty();

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'IGLEICO Distrito Sabana API', time: new Date().toISOString() });
});

// Rutas API
app.use('/api/auth', authRouter);
app.use('/api', districtRouter);
app.use('/api/churches', churchesRouter);
app.use('/api/pastors', pastorsRouter);
app.use('/api/members', membersRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/finance', financeRouter);
app.use('/api/reports', reportsRouter);

// Servir frontend compilado en producción
const publicDir = path.join(process.cwd(), 'dist', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error interno en API:', err);
  res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
});

const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`IGLEICO Distrito Sabana escuchando en http://localhost:${PORT}`);
});
