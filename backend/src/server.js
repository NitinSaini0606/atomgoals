import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import authRouter from './routes/auth.js';
import employeeGoalsRouter from './routes/employeeGoals.js';
import managerGoalsRouter from './routes/managerGoals.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use('/auth', authRouter);
app.use('/employee', employeeGoalsRouter);
app.use('/manager', managerGoalsRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'atomgoals-api'
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error' });
});

app.listen(port, () => {
  console.log(`AtomGoals API listening on port ${port}`);
});
