import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

const router = express.Router();

const getCurrentQuarter = () => {
  const now = new Date();
  return {
    quarter: `Q${Math.floor(now.getMonth() / 3) + 1}`,
    year: now.getFullYear()
  };
};

const getQuarterDates = (quarter, year) => {
  const quarterNumber = Number(quarter.replace('Q', ''));
  const startMonth = (quarterNumber - 1) * 3;

  return {
    startDate: new Date(Date.UTC(year, startMonth, 1)),
    endDate: new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59))
  };
};

export const ensureActiveCycle = async (client = prisma) => {
  const { quarter, year } = getCurrentQuarter();
  const { startDate, endDate } = getQuarterDates(quarter, year);

  return client.goalCycle.upsert({
    where: { year_quarter: { year, quarter } },
    update: { status: 'ACTIVE' },
    create: {
      name: `${quarter} ${year} Goal Cycle`,
      quarter,
      year,
      startDate,
      endDate,
      status: 'ACTIVE',
      activePhase: 'GOAL_SETTING'
    }
  });
};

router.use(requireAuth);

router.get('/active', async (_req, res, next) => {
  try {
    const cycle = await ensureActiveCycle();
    return res.json({ cycle });
  } catch (error) {
    return next(error);
  }
});

export default router;
