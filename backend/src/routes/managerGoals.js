import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

const router = express.Router();
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

const validateQuarter = (quarter) => quarters.includes(quarter);

const toDateInput = (date) => date ? date.toISOString().slice(0, 10) : '';

const mapGoal = (goal) => ({
  ...goal,
  deadline: toDateInput(goal.deadline)
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

const mapAchievement = (achievement) => achievement ? ({
  ...achievement,
  completionDate: toDateInput(achievement.completionDate)
}) : null;

const mapCheckIn = (checkIn) => checkIn ? ({
  ...checkIn,
  completedAt: checkIn.completedAt ? checkIn.completedAt.toISOString() : null
}) : null;

const mapProgressGoal = (goal, quarter) => ({
  ...mapGoal(goal),
  achievement: mapAchievement(goal.achievements.find((item) => item.quarter === quarter))
});

const getApprovedSheetForReport = async (employeeId, managerId, quarter) => {
  return prisma.goalSheet.findFirst({
    where: {
      ownerId: Number(employeeId),
      status: 'APPROVED_LOCKED',
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
      goals: {
        orderBy: { createdAt: 'asc' },
        include: {
          achievements: { where: { quarter } }
        }
      }
    },
    orderBy: { approvedAt: 'desc' }
  });
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

router.get('/checkins', async (req, res, next) => {
  try {
    const quarter = req.query.quarter;

    if (!validateQuarter(quarter)) {
      return res.status(400).json({ message: 'Quarter is required and must be Q1, Q2, Q3, or Q4.' });
    }

    const sheets = await prisma.goalSheet.findMany({
      where: {
        status: 'APPROVED_LOCKED',
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
        goals: {
          include: {
            achievements: { where: { quarter } }
          }
        }
      },
      orderBy: { approvedAt: 'desc' }
    });

    const employeeIds = sheets.map((sheet) => sheet.ownerId);
    const checkIns = await prisma.checkIn.findMany({
      where: {
        userId: { in: employeeIds },
        managerId: Number(req.user.sub),
        quarter
      }
    });

    return res.json({
      employees: sheets.map((sheet) => {
        const checkIn = checkIns.find((item) => item.userId === sheet.ownerId);
        const weightedScore = sheet.goals.reduce((sum, goal) => {
          const achievement = goal.achievements[0];
          return sum + Number(achievement?.weightedScore || 0);
        }, 0);

        return {
          employee: sheet.owner,
          goalSheetId: sheet.id,
          quarter,
          goalCount: sheet.goals.length,
          weightedScore: Number(weightedScore.toFixed(2)),
          checkIn: mapCheckIn(checkIn)
        };
      })
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/checkins/:employeeId', async (req, res, next) => {
  try {
    const quarter = req.query.quarter;

    if (!validateQuarter(quarter)) {
      return res.status(400).json({ message: 'Quarter is required and must be Q1, Q2, Q3, or Q4.' });
    }

    const sheet = await getApprovedSheetForReport(req.params.employeeId, req.user.sub, quarter);

    if (!sheet) {
      return res.status(404).json({ message: 'Approved locked Goal Sheet not found for this reporting line.' });
    }

    const checkIn = await prisma.checkIn.findUnique({
      where: {
        userId_managerId_quarter: {
          userId: sheet.ownerId,
          managerId: Number(req.user.sub),
          quarter
        }
      }
    });

    return res.json({
      employee: sheet.owner,
      goalSheet: sheet,
      quarter,
      goals: sheet.goals.map((goal) => mapProgressGoal(goal, quarter)),
      checkIn: mapCheckIn(checkIn)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/checkins/:employeeId', async (req, res, next) => {
  try {
    const quarter = req.body.quarter;
    const comment = req.body.comment?.trim();

    if (!validateQuarter(quarter)) {
      return res.status(400).json({ message: 'Quarter is required and must be Q1, Q2, Q3, or Q4.' });
    }
    if (req.body.completed && !comment) {
      return res.status(400).json({ message: 'Manager Check-in Comment is required before marking completed.' });
    }

    const sheet = await getApprovedSheetForReport(req.params.employeeId, req.user.sub, quarter);

    if (!sheet) {
      return res.status(404).json({ message: 'Approved locked Goal Sheet not found for this reporting line.' });
    }

    const existingCheckIn = await prisma.checkIn.findUnique({
      where: {
        userId_managerId_quarter: {
          userId: sheet.ownerId,
          managerId: Number(req.user.sub),
          quarter
        }
      }
    });

    if (existingCheckIn?.status === 'COMPLETED') {
      return res.status(409).json({ message: 'Completed check-ins are locked and cannot be edited.' });
    }

    const checkIn = await prisma.$transaction(async (tx) => {
      const result = await tx.checkIn.upsert({
        where: {
          userId_managerId_quarter: {
            userId: sheet.ownerId,
            managerId: Number(req.user.sub),
            quarter
          }
        },
        update: {
          comment: comment || null,
          status: req.body.completed ? 'COMPLETED' : 'DRAFT',
          completedAt: req.body.completed ? new Date() : null,
          cycleId: sheet.cycleId
        },
        create: {
          userId: sheet.ownerId,
          managerId: Number(req.user.sub),
          quarter,
          comment: comment || null,
          status: req.body.completed ? 'COMPLETED' : 'DRAFT',
          completedAt: req.body.completed ? new Date() : null,
          cycleId: sheet.cycleId
        }
      });

      if (req.body.completed) {
        await tx.auditLog.create({
          data: {
            actorId: Number(req.user.sub),
            action: 'MANAGER_COMPLETED_QUARTERLY_CHECKIN',
            entityType: 'CheckIn',
            entityId: result.id,
            details: {
              employeeId: sheet.ownerId,
              quarter
            }
          }
        });
      }

      return result;
    });

    return res.json({ checkIn: mapCheckIn(checkIn) });
  } catch (error) {
    return next(error);
  }
});

export default router;
