import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

const router = express.Router();
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const achievementStatuses = ['NOT_STARTED', 'ON_TRACK', 'COMPLETED'];

const validateQuarter = (quarter) => quarters.includes(quarter);

const toDateInput = (date) => date ? date.toISOString().slice(0, 10) : '';

const mapAchievement = (achievement) => achievement ? ({
  ...achievement,
  completionDate: toDateInput(achievement.completionDate)
}) : null;

const mapGoalWithAchievement = (goal, quarter) => ({
  ...goal,
  deadline: toDateInput(goal.deadline),
  achievement: mapAchievement(goal.achievements.find((item) => item.quarter === quarter))
});

const getApprovedGoalSheet = async (userId) => {
  return prisma.goalSheet.findFirst({
    where: {
      ownerId: userId,
      status: 'APPROVED_LOCKED'
    },
    include: {
      cycle: true,
      goals: {
        orderBy: { createdAt: 'asc' },
        include: { achievements: true }
      }
    },
    orderBy: { approvedAt: 'desc' }
  });
};

const getEmployeeGoal = async (goalId, userId) => {
  return prisma.goal.findFirst({
    where: {
      id: Number(goalId),
      ownerId: userId,
      goalSheet: { status: 'APPROVED_LOCKED' }
    },
    include: { goalSheet: true }
  });
};

const clampScore = (score) => Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));

const calculateScores = (goal, payload) => {
  const target = Number(goal.targetValue);
  const actual = Number(payload.actualValue);
  let progressScore = 0;

  if (goal.uomType === 'NUMERIC' || goal.uomType === 'PERCENTAGE') {
    if (goal.scoreDirection === 'MIN') {
      progressScore = target > 0 ? (actual / target) * 100 : 0;
    } else if (goal.scoreDirection === 'MAX') {
      progressScore = actual > 0 ? (target / actual) * 100 : 100;
    }
  }

  if (goal.uomType === 'ZERO_BASED') {
    progressScore = actual === 0 ? 100 : 0;
  }

  if (goal.uomType === 'TIMELINE') {
    const completionDate = payload.completionDate ? new Date(payload.completionDate) : null;
    if (payload.status === 'COMPLETED' && completionDate && goal.deadline) {
      progressScore = completionDate <= goal.deadline ? 100 : 70;
    }
  }

  progressScore = clampScore(progressScore);

  return {
    progressScore,
    weightedScore: Number(((progressScore * Number(goal.weight)) / 100).toFixed(2))
  };
};

const validateAchievementPayload = (goal, body) => {
  const errors = [];

  if (!validateQuarter(body.quarter)) {
    errors.push('Quarter is required and must be Q1, Q2, Q3, or Q4.');
  }
  if (!achievementStatuses.includes(body.status)) {
    errors.push('Select a valid achievement status.');
  }
  if (['NUMERIC', 'PERCENTAGE', 'ZERO_BASED'].includes(goal.uomType)) {
    if (!String(body.actualValue ?? '').trim()) {
      errors.push('Actual Achievement is required for this goal.');
    } else if (Number.isNaN(Number(body.actualValue))) {
      errors.push('Actual Achievement must be a number for this goal.');
    }
  }
  if (goal.uomType === 'TIMELINE' && body.status === 'COMPLETED' && !body.completionDate) {
    errors.push('Completion Date is required when a timeline goal is completed.');
  }

  return errors;
};

router.use(requireAuth, requireRole('EMPLOYEE'));

router.get('/achievements', async (req, res, next) => {
  try {
    const quarter = req.query.quarter;

    if (!validateQuarter(quarter)) {
      return res.status(400).json({ message: 'Quarter is required and must be Q1, Q2, Q3, or Q4.' });
    }

    const sheet = await getApprovedGoalSheet(Number(req.user.sub));

    if (!sheet) {
      return res.json({ goalSheet: null, goals: [] });
    }

    return res.json({
      goalSheet: sheet,
      goals: sheet.goals.map((goal) => mapGoalWithAchievement(goal, quarter))
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/achievements', async (req, res, next) => {
  try {
    const userId = Number(req.user.sub);
    const goal = await getEmployeeGoal(req.body.goalId, userId);

    if (!goal) {
      return res.status(404).json({ message: 'Locked goal not found for your approved Goal Sheet.' });
    }

    const errors = validateAchievementPayload(goal, req.body);

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Please fix the quarterly achievement update.', errors });
    }

    const scores = calculateScores(goal, req.body);

    const achievement = await prisma.$transaction(async (tx) => {
      const result = await tx.achievement.upsert({
        where: { goalId_quarter: { goalId: goal.id, quarter: req.body.quarter } },
        update: {
          actualValue: String(req.body.actualValue ?? '').trim() || null,
          status: req.body.status,
          completionDate: req.body.completionDate ? new Date(req.body.completionDate) : null,
          employeeNote: req.body.employeeNote?.trim() || null,
          ...scores
        },
        create: {
          goalId: goal.id,
          userId,
          quarter: req.body.quarter,
          actualValue: String(req.body.actualValue ?? '').trim() || null,
          status: req.body.status,
          completionDate: req.body.completionDate ? new Date(req.body.completionDate) : null,
          employeeNote: req.body.employeeNote?.trim() || null,
          ...scores
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'EMPLOYEE_SAVED_QUARTERLY_ACHIEVEMENT',
          entityType: 'Achievement',
          entityId: result.id,
          details: {
            goalId: goal.id,
            quarter: req.body.quarter,
            progressScore: scores.progressScore,
            weightedScore: scores.weightedScore
          }
        }
      });

      return result;
    });

    return res.status(201).json({ achievement: mapAchievement(achievement) });
  } catch (error) {
    return next(error);
  }
});

router.put('/achievements/:id', async (req, res, next) => {
  try {
    const userId = Number(req.user.sub);
    const existing = await prisma.achievement.findFirst({
      where: {
        id: Number(req.params.id),
        userId,
        goal: { goalSheet: { status: 'APPROVED_LOCKED' } }
      },
      include: { goal: true }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Quarterly achievement not found for your locked Goal Sheet.' });
    }

    const body = { ...req.body, quarter: req.body.quarter || existing.quarter };
    const errors = validateAchievementPayload(existing.goal, body);

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Please fix the quarterly achievement update.', errors });
    }

    const scores = calculateScores(existing.goal, body);

    const achievement = await prisma.$transaction(async (tx) => {
      const result = await tx.achievement.update({
        where: { id: existing.id },
        data: {
          actualValue: String(body.actualValue ?? '').trim() || null,
          status: body.status,
          completionDate: body.completionDate ? new Date(body.completionDate) : null,
          employeeNote: body.employeeNote?.trim() || null,
          ...scores
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'EMPLOYEE_SAVED_QUARTERLY_ACHIEVEMENT',
          entityType: 'Achievement',
          entityId: result.id,
          details: {
            goalId: existing.goalId,
            quarter: existing.quarter,
            progressScore: scores.progressScore,
            weightedScore: scores.weightedScore
          }
        }
      });

      return result;
    });

    return res.json({ achievement: mapAchievement(achievement) });
  } catch (error) {
    return next(error);
  }
});

export default router;
