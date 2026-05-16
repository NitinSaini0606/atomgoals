import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

const router = express.Router();

const mapGoal = (goal) => ({
  ...goal,
  deadline: goal.deadline ? goal.deadline.toISOString().slice(0, 10) : ''
});

const mapSheet = (sheet) => ({
  ...sheet,
  goals: sheet.goals.map(mapGoal)
});

const getSheetForManager = async (sheetId, managerId) => {
  return prisma.goalSheet.findFirst({
    where: {
      id: Number(sheetId),
      owner: { managerId: Number(managerId) }
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeCode: true
        }
      },
      cycle: true,
      goals: { orderBy: { createdAt: 'asc' } }
    }
  });
};

const validateManagerGoalUpdate = (body) => {
  const errors = [];
  const weight = Number(body.weight);

  if (!String(body.targetValue ?? '').trim()) {
    errors.push('Target Value is required.');
  }
  if (!Number.isInteger(weight) || weight < 10 || weight > 100) {
    errors.push('Each goal must have a weightage between 10% and 100%.');
  }
  if (body.uomType === 'TIMELINE' && !body.deadline) {
    errors.push('Timeline goals must include a deadline.');
  }

  return errors;
};

const validateWeights = (goals) => {
  const errors = [];
  const totalWeight = goals.reduce((sum, goal) => sum + Number(goal.weight), 0);

  if (totalWeight !== 100) {
    errors.push(`Total weightage must equal exactly 100%. Current total is ${totalWeight}%.`);
  }

  for (const goal of goals) {
    if (Number(goal.weight) < 10) {
      errors.push(`"${goal.title}" has less than the minimum 10% weightage.`);
    }
  }

  return errors;
};

router.use(requireAuth, requireRole('MANAGER'));

router.get('/goal-sheets', async (req, res, next) => {
  try {
    const sheets = await prisma.goalSheet.findMany({
      where: {
        status: 'SUBMITTED',
        owner: { managerId: Number(req.user.sub) }
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true
          }
        },
        cycle: true,
        goals: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { submittedAt: 'asc' }
    });

    return res.json({ goalSheets: sheets.map(mapSheet) });
  } catch (error) {
    return next(error);
  }
});

router.get('/goal-sheets/:id', async (req, res, next) => {
  try {
    const sheet = await getSheetForManager(req.params.id, req.user.sub);

    if (!sheet) {
      return res.status(404).json({ message: 'Submitted Goal Sheet not found for your reporting line.' });
    }

    return res.json({ goalSheet: mapSheet(sheet) });
  } catch (error) {
    return next(error);
  }
});

router.put('/goal-sheets/:sheetId/goals/:goalId', async (req, res, next) => {
  try {
    const sheet = await getSheetForManager(req.params.sheetId, req.user.sub);

    if (!sheet) {
      return res.status(404).json({ message: 'Submitted Goal Sheet not found for your reporting line.' });
    }
    if (sheet.status !== 'SUBMITTED') {
      return res.status(409).json({ message: 'Only submitted Goal Sheets can be edited during L1 Manager Approval.' });
    }

    const goal = sheet.goals.find((item) => item.id === Number(req.params.goalId));

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found on this Goal Sheet.' });
    }

    const errors = validateManagerGoalUpdate({ ...req.body, uomType: goal.uomType });

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Please fix the manager review fields.', errors });
    }

    const updatedGoal = await prisma.$transaction(async (tx) => {
      const result = await tx.goal.update({
        where: { id: goal.id },
        data: {
          targetValue: String(req.body.targetValue).trim(),
          deadline: req.body.deadline ? new Date(req.body.deadline) : null,
          weight: Number(req.body.weight)
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: Number(req.user.sub),
          action: 'MANAGER_EDITED_GOAL_REVIEW_FIELDS',
          entityType: 'Goal',
          entityId: goal.id,
          details: {
            goalSheetId: sheet.id,
            employeeId: sheet.ownerId,
            editedFields: ['targetValue', 'deadline', 'weight']
          }
        }
      });

      return result;
    });

    return res.json({ goal: mapGoal(updatedGoal) });
  } catch (error) {
    return next(error);
  }
});

router.post('/goal-sheets/:id/return', async (req, res, next) => {
  try {
    const comment = req.body.comment?.trim();

    if (!comment) {
      return res.status(400).json({ message: 'Return for Rework requires a manager comment.' });
    }

    const sheet = await getSheetForManager(req.params.id, req.user.sub);

    if (!sheet) {
      return res.status(404).json({ message: 'Submitted Goal Sheet not found for your reporting line.' });
    }
    if (sheet.status !== 'SUBMITTED') {
      return res.status(409).json({ message: 'Only submitted Goal Sheets can be returned for rework.' });
    }

    const updatedSheet = await prisma.$transaction(async (tx) => {
      await tx.goal.updateMany({
        where: { goalSheetId: sheet.id },
        data: { status: 'REVISION_REQUESTED' }
      });

      await tx.auditLog.create({
        data: {
          actorId: Number(req.user.sub),
          action: 'MANAGER_RETURNED_GOAL_SHEET_FOR_REWORK',
          entityType: 'GoalSheet',
          entityId: sheet.id,
          details: {
            employeeId: sheet.ownerId,
            comment
          }
        }
      });

      return tx.goalSheet.update({
        where: { id: sheet.id },
        data: {
          status: 'REVISION_REQUESTED',
          managerFeedback: comment,
          reviewedAt: new Date()
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              employeeCode: true
            }
          },
          cycle: true,
          goals: { orderBy: { createdAt: 'asc' } }
        }
      });
    });

    return res.json({ goalSheet: mapSheet(updatedSheet) });
  } catch (error) {
    return next(error);
  }
});

router.post('/goal-sheets/:id/approve', async (req, res, next) => {
  try {
    const sheet = await getSheetForManager(req.params.id, req.user.sub);

    if (!sheet) {
      return res.status(404).json({ message: 'Submitted Goal Sheet not found for your reporting line.' });
    }
    if (sheet.status !== 'SUBMITTED') {
      return res.status(409).json({ message: 'Only submitted Goal Sheets can be approved and locked.' });
    }

    const errors = validateWeights(sheet.goals);

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Goal Sheet cannot be approved yet.', errors });
    }

    const updatedSheet = await prisma.$transaction(async (tx) => {
      await tx.goal.updateMany({
        where: { goalSheetId: sheet.id },
        data: { status: 'APPROVED_LOCKED' }
      });

      await tx.auditLog.create({
        data: {
          actorId: Number(req.user.sub),
          action: 'MANAGER_APPROVED_AND_LOCKED_GOAL_SHEET',
          entityType: 'GoalSheet',
          entityId: sheet.id,
          details: {
            employeeId: sheet.ownerId
          }
        }
      });

      return tx.goalSheet.update({
        where: { id: sheet.id },
        data: {
          status: 'APPROVED_LOCKED',
          reviewedAt: new Date(),
          approvedAt: new Date()
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              employeeCode: true
            }
          },
          cycle: true,
          goals: { orderBy: { createdAt: 'asc' } }
        }
      });
    });

    return res.json({ goalSheet: mapSheet(updatedSheet) });
  } catch (error) {
    return next(error);
  }
});

export default router;
