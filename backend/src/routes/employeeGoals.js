import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

const router = express.Router();
const editableStatuses = ['DRAFT', 'REVISION_REQUESTED'];
const uomTypes = ['NUMERIC', 'PERCENTAGE', 'TIMELINE', 'ZERO_BASED'];
const scoreDirections = ['MIN', 'MAX', 'NONE'];

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

const ensureCurrentGoalSheet = async (userId) => {
  const { quarter, year } = getCurrentQuarter();
  const { startDate, endDate } = getQuarterDates(quarter, year);

  const cycle = await prisma.goalCycle.upsert({
    where: { year_quarter: { year, quarter } },
    update: { status: 'ACTIVE' },
    create: {
      name: `${quarter} ${year} Goal Cycle`,
      quarter,
      year,
      startDate,
      endDate,
      status: 'ACTIVE'
    }
  });

  return prisma.goalSheet.upsert({
    where: { ownerId_cycleId: { ownerId: userId, cycleId: cycle.id } },
    update: {},
    create: {
      ownerId: userId,
      cycleId: cycle.id,
      status: 'DRAFT'
    },
    include: {
      cycle: true,
      goals: { orderBy: { createdAt: 'asc' } }
    }
  });
};

const mapGoal = (goal) => ({
  ...goal,
  deadline: goal.deadline ? goal.deadline.toISOString().slice(0, 10) : ''
});

const validateGoalPayload = (body) => {
  const errors = [];
  const weight = Number(body.weight);

  if (!body.thrustArea?.trim()) errors.push('Thrust Area is required.');
  if (!body.title?.trim()) errors.push('Goal Title is required.');
  if (!body.description?.trim()) errors.push('Goal Description is required.');
  if (!uomTypes.includes(body.uomType)) errors.push('Select a valid UoM Type.');
  if (!scoreDirections.includes(body.scoreDirection)) errors.push('Select a valid Score Direction.');
  if (!String(body.targetValue ?? '').trim()) errors.push('Target Value is required.');
  if (!Number.isInteger(weight) || weight < 10 || weight > 100) {
    errors.push('Each goal must have a weightage between 10% and 100%.');
  }
  if (body.uomType === 'TIMELINE' && !body.deadline) {
    errors.push('Timeline goals must include a deadline.');
  }

  return errors;
};

const validateGoalSheetForSubmission = (goals) => {
  const errors = [];

  if (goals.length === 0) {
    errors.push('Add at least one goal before submitting your Goal Sheet.');
  }
  if (goals.length > 8) {
    errors.push('A Goal Sheet can have a maximum of 8 goals.');
  }

  const totalWeight = goals.reduce((sum, goal) => sum + Number(goal.weight), 0);

  if (totalWeight !== 100) {
    errors.push(`Total weightage must equal exactly 100%. Current total is ${totalWeight}%.`);
  }

  for (const goal of goals) {
    if (Number(goal.weight) < 10) {
      errors.push(`"${goal.title}" has less than the minimum 10% weightage.`);
    }
    if (!goal.thrustArea || !goal.title || !goal.description || !goal.targetValue) {
      errors.push(`"${goal.title || 'One goal'}" has missing required fields.`);
    }
    if (goal.uomType === 'TIMELINE' && !goal.deadline) {
      errors.push(`"${goal.title}" is a timeline goal and needs a deadline.`);
    }
  }

  return errors;
};

const requireEditableSheet = (sheet) => {
  if (!editableStatuses.includes(sheet.status)) {
    return 'Submitted Goal Sheets cannot be edited unless the manager returns them for rework.';
  }

  return null;
};

router.use(requireAuth, requireRole('EMPLOYEE'));

router.get('/goal-sheet', async (req, res, next) => {
  try {
    const sheet = await ensureCurrentGoalSheet(Number(req.user.sub));
    return res.json({
      goalSheet: {
        ...sheet,
        goals: sheet.goals.map(mapGoal)
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/goals', async (req, res, next) => {
  try {
    const sheet = await ensureCurrentGoalSheet(Number(req.user.sub));
    const sheetError = requireEditableSheet(sheet);

    if (sheetError) {
      return res.status(409).json({ message: sheetError });
    }
    if (sheet.goals.length >= 8) {
      return res.status(400).json({ message: 'A Goal Sheet can have a maximum of 8 goals.' });
    }

    const errors = validateGoalPayload(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Please fix the goal details.', errors });
    }

    const goal = await prisma.goal.create({
      data: {
        thrustArea: req.body.thrustArea.trim(),
        title: req.body.title.trim(),
        description: req.body.description.trim(),
        uomType: req.body.uomType,
        scoreDirection: req.body.scoreDirection,
        targetValue: String(req.body.targetValue).trim(),
        deadline: req.body.deadline ? new Date(req.body.deadline) : null,
        weight: Number(req.body.weight),
        status: sheet.status,
        ownerId: Number(req.user.sub),
        managerId: req.user.managerId || null,
        cycleId: sheet.cycleId,
        goalSheetId: sheet.id
      }
    });

    return res.status(201).json({ goal: mapGoal(goal) });
  } catch (error) {
    return next(error);
  }
});

router.put('/goals/:id', async (req, res, next) => {
  try {
    const sheet = await ensureCurrentGoalSheet(Number(req.user.sub));
    const sheetError = requireEditableSheet(sheet);

    if (sheetError) {
      return res.status(409).json({ message: sheetError });
    }

    const existingGoal = sheet.goals.find((goal) => goal.id === Number(req.params.id));

    if (!existingGoal) {
      return res.status(404).json({ message: 'Goal not found on your current Goal Sheet.' });
    }

    const errors = validateGoalPayload(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Please fix the goal details.', errors });
    }

    const goal = await prisma.goal.update({
      where: { id: existingGoal.id },
      data: {
        thrustArea: req.body.thrustArea.trim(),
        title: req.body.title.trim(),
        description: req.body.description.trim(),
        uomType: req.body.uomType,
        scoreDirection: req.body.scoreDirection,
        targetValue: String(req.body.targetValue).trim(),
        deadline: req.body.deadline ? new Date(req.body.deadline) : null,
        weight: Number(req.body.weight)
      }
    });

    return res.json({ goal: mapGoal(goal) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/goals/:id', async (req, res, next) => {
  try {
    const sheet = await ensureCurrentGoalSheet(Number(req.user.sub));
    const sheetError = requireEditableSheet(sheet);

    if (sheetError) {
      return res.status(409).json({ message: sheetError });
    }

    const existingGoal = sheet.goals.find((goal) => goal.id === Number(req.params.id));

    if (!existingGoal) {
      return res.status(404).json({ message: 'Goal not found on your current Goal Sheet.' });
    }

    await prisma.goal.delete({ where: { id: existingGoal.id } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.post('/goal-sheet/submit', async (req, res, next) => {
  try {
    const sheet = await ensureCurrentGoalSheet(Number(req.user.sub));
    const sheetError = requireEditableSheet(sheet);

    if (sheetError) {
      return res.status(409).json({ message: sheetError });
    }

    const errors = validateGoalSheetForSubmission(sheet.goals);

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Goal Sheet is not ready for submission.', errors });
    }

    const updatedSheet = await prisma.$transaction(async (tx) => {
      await tx.goal.updateMany({
        where: { goalSheetId: sheet.id },
        data: { status: 'SUBMITTED' }
      });

      await tx.auditLog.create({
        data: {
          actorId: Number(req.user.sub),
          action: 'GOAL_SHEET_SUBMITTED',
          entityType: 'GoalSheet',
          entityId: sheet.id
        }
      });

      return tx.goalSheet.update({
        where: { id: sheet.id },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
        include: {
          cycle: true,
          goals: { orderBy: { createdAt: 'asc' } }
        }
      });
    });

    return res.json({
      goalSheet: {
        ...updatedSheet,
        goals: updatedSheet.goals.map(mapGoal)
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
