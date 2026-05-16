import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { ensureActiveCycle } from './cycle.js';

const router = express.Router();
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const phases = ['GOAL_SETTING', 'Q1', 'Q2', 'Q3', 'Q4'];

const getEscalationLevel = (pendingSince) => {
  if (!pendingSince) return 'LEVEL_1_EMPLOYEE';

  const ageMs = Date.now() - new Date(pendingSince).getTime();
  const ageDays = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));

  if (ageDays <= 2) return 'LEVEL_1_EMPLOYEE';
  if (ageDays <= 5) return 'LEVEL_2_MANAGER';
  return 'LEVEL_3_HR';
};

const buildEscalation = ({ employee, manager, issueType, phase, pendingSince, suggestedAction }) => {
  const level = getEscalationLevel(pendingSince);
  const responsiblePerson = level === 'LEVEL_1_EMPLOYEE'
    ? employee.name
    : level === 'LEVEL_2_MANAGER'
      ? manager?.name || 'Manager not assigned'
      : 'HR / Admin';

  return {
    id: `${issueType}-${employee.id}-${phase}`,
    employeeName: employee.name,
    managerName: manager?.name || '',
    issueType,
    relatedPhase: phase,
    pendingSince,
    pendingSinceLabel: pendingSince ? new Date(pendingSince).toISOString() : 'Pending date unavailable',
    escalationLevel: level,
    responsiblePerson,
    status: 'OPEN',
    suggestedAction
  };
};

const roundScore = (value) => {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 100) / 100);
};

const csvValue = (value) => {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const getLatestSheet = (user) => user.goalSheets[0] || null;

const getCheckInStatus = (checkIns, quarter) => {
  return checkIns.find((checkIn) => checkIn.quarter === quarter)?.status || 'PENDING';
};

router.use(requireAuth, requireRole('ADMIN'));

router.get('/dashboard', async (_req, res, next) => {
  try {
    const [totalEmployees, totalManagers, draft, submitted, returned, approved, lockedSheets] = await Promise.all([
      prisma.user.count({ where: { role: 'EMPLOYEE', isActive: true } }),
      prisma.user.count({ where: { role: 'MANAGER', isActive: true } }),
      prisma.goalSheet.count({ where: { status: 'DRAFT' } }),
      prisma.goalSheet.count({ where: { status: 'SUBMITTED' } }),
      prisma.goalSheet.count({ where: { status: 'REVISION_REQUESTED' } }),
      prisma.goalSheet.count({ where: { status: 'APPROVED_LOCKED' } }),
      prisma.goalSheet.findMany({
        where: { status: 'APPROVED_LOCKED' },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              manager: { select: { name: true, email: true } }
            }
          },
          cycle: true
        },
        orderBy: { approvedAt: 'desc' }
      })
    ]);

    const checkInSummary = {};
    const approvedEmployeeIds = [...new Set(lockedSheets.map((sheet) => sheet.ownerId))];

    for (const quarter of quarters) {
      const completed = await prisma.checkIn.count({
        where: {
          quarter,
          status: 'COMPLETED',
          userId: { in: approvedEmployeeIds }
        }
      });

      checkInSummary[quarter] = {
        completed,
        pending: Math.max(approvedEmployeeIds.length - completed, 0)
      };
    }

    return res.json({
      summary: {
        totalEmployees,
        totalManagers,
        goalSheetsDraft: draft,
        goalSheetsSubmitted: submitted,
        goalSheetsReturned: returned,
        goalSheetsApprovedLocked: approved,
        checkIns: checkInSummary
      },
      unlockableGoalSheets: lockedSheets.map((sheet) => ({
        id: sheet.id,
        employeeName: sheet.owner.name,
        employeeEmail: sheet.owner.email,
        managerName: sheet.owner.manager?.name || '',
        cycleName: sheet.cycle.name,
        status: sheet.status
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/escalations', async (_req, res, next) => {
  try {
    const cycle = await ensureActiveCycle();
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        goalSheets: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: { goals: true }
        },
        checkIns: true
      },
      orderBy: { name: 'asc' }
    });

    const escalations = [];

    for (const employee of employees) {
      const sheet = employee.goalSheets[0];

      if (cycle.activePhase === 'GOAL_SETTING') {
        if (!sheet || ['DRAFT', 'REVISION_REQUESTED'].includes(sheet.status)) {
          escalations.push(buildEscalation({
            employee,
            manager: employee.manager,
            issueType: 'GOAL_NOT_SUBMITTED',
            phase: 'GOAL_SETTING',
            pendingSince: sheet?.updatedAt || employee.createdAt,
            suggestedAction: 'Ask employee to submit the Goal Sheet for L1 Manager Approval.'
          }));
        }

        if (sheet?.status === 'SUBMITTED') {
          escalations.push(buildEscalation({
            employee,
            manager: employee.manager,
            issueType: 'MANAGER_APPROVAL_PENDING',
            phase: 'GOAL_SETTING',
            pendingSince: sheet.submittedAt || sheet.updatedAt,
            suggestedAction: 'Ask L1 Manager to review, return, or approve and lock the Goal Sheet.'
          }));
        }
      }

      if (quarters.includes(cycle.activePhase) && sheet?.status === 'APPROVED_LOCKED') {
        const checkIn = employee.checkIns.find((item) => item.quarter === cycle.activePhase);

        if (checkIn?.status !== 'COMPLETED') {
          escalations.push(buildEscalation({
            employee,
            manager: employee.manager,
            issueType: 'CHECKIN_NOT_COMPLETED',
            phase: cycle.activePhase,
            pendingSince: checkIn?.updatedAt || sheet.approvedAt || sheet.updatedAt,
            suggestedAction: `Ask manager to complete the ${cycle.activePhase} Quarterly Check-in.`
          }));
        }
      }
    }

    return res.json({
      activePhase: cycle.activePhase,
      note: 'Dynamic escalation status is derived from current workflow state.',
      escalations
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/cycle/phase', async (req, res, next) => {
  try {
    const activePhase = req.body.activePhase;

    if (!phases.includes(activePhase)) {
      return res.status(400).json({ message: 'Active phase must be GOAL_SETTING, Q1, Q2, Q3, or Q4.' });
    }

    const cycle = await ensureActiveCycle();
    const oldPhase = cycle.activePhase;

    const updatedCycle = await prisma.$transaction(async (tx) => {
      const result = await tx.goalCycle.update({
        where: { id: cycle.id },
        data: { activePhase }
      });

      if (oldPhase !== activePhase) {
        await tx.auditLog.create({
          data: {
            actorId: Number(req.user.sub),
            action: 'ADMIN_CHANGED_ACTIVE_PHASE',
            entityType: 'GoalCycle',
            entityId: cycle.id,
            details: {
              oldPhase,
              newPhase: activePhase
            }
          }
        });
      }

      return result;
    });

    return res.json({ cycle: updatedCycle });
  } catch (error) {
    return next(error);
  }
});

router.get('/completion', async (_req, res, next) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
      include: {
        manager: { select: { name: true, email: true } },
        goalSheets: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: { goals: true }
        },
        checkIns: true
      },
      orderBy: { name: 'asc' }
    });

    return res.json({
      rows: employees.map((employee) => {
        const sheet = getLatestSheet(employee);
        const goals = sheet?.goals || [];

        return {
          employeeName: employee.name,
          employeeEmail: employee.email,
          managerName: employee.manager?.name || '',
          goalSheetStatus: sheet?.status || 'NOT_STARTED',
          totalGoals: goals.length,
          totalWeightage: goals.reduce((sum, goal) => sum + Number(goal.weight), 0),
          q1CheckInStatus: getCheckInStatus(employee.checkIns, 'Q1'),
          q2CheckInStatus: getCheckInStatus(employee.checkIns, 'Q2'),
          q3CheckInStatus: getCheckInStatus(employee.checkIns, 'Q3'),
          q4CheckInStatus: getCheckInStatus(employee.checkIns, 'Q4')
        };
      })
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/audit-logs', async (_req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        actor: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return res.json({ auditLogs: logs });
  } catch (error) {
    return next(error);
  }
});

router.post('/goal-sheets/:id/unlock', async (req, res, next) => {
  try {
    const reason = req.body.reason?.trim();

    if (!reason) {
      return res.status(400).json({ message: 'Unlock reason is required.' });
    }

    const sheet = await prisma.goalSheet.findUnique({
      where: { id: Number(req.params.id) },
      include: { owner: true }
    });

    if (!sheet) {
      return res.status(404).json({ message: 'Goal Sheet not found.' });
    }
    if (sheet.status !== 'APPROVED_LOCKED') {
      return res.status(409).json({ message: 'Only approved locked Goal Sheets can be unlocked.' });
    }

    const updatedSheet = await prisma.$transaction(async (tx) => {
      await tx.goal.updateMany({
        where: { goalSheetId: sheet.id },
        data: { status: 'REVISION_REQUESTED' }
      });

      const result = await tx.goalSheet.update({
        where: { id: sheet.id },
        data: {
          status: 'REVISION_REQUESTED',
          managerFeedback: `Admin unlock: ${reason}`,
          reviewedAt: new Date(),
          approvedAt: null
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: Number(req.user.sub),
          action: 'ADMIN_UNLOCKED_GOAL_SHEET',
          entityType: 'GoalSheet',
          entityId: sheet.id,
          details: {
            employeeId: sheet.ownerId,
            reason,
            oldStatus: 'APPROVED_LOCKED',
            newStatus: 'REVISION_REQUESTED'
          }
        }
      });

      return result;
    });

    return res.json({ goalSheet: updatedSheet });
  } catch (error) {
    return next(error);
  }
});

router.get('/reports/achievement.csv', async (_req, res, next) => {
  try {
    const sheets = await prisma.goalSheet.findMany({
      include: {
        owner: {
          select: {
            name: true,
            email: true,
            manager: { select: { name: true } }
          }
        },
        goals: {
          include: {
            achievements: true
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const rows = [
      [
        'Employee Name',
        'Employee Email',
        'Manager Name',
        'Goal Sheet Status',
        'Quarter',
        'Goal Title',
        'Thrust Area',
        'UoM Type',
        'Target Value',
        'Actual Achievement',
        'Employee Status',
        'Progress Score',
        'Weightage',
        'Weighted Score',
        'Employee Note',
        'Manager Check-in Status',
        'Manager Check-in Comment'
      ]
    ];

    for (const sheet of sheets) {
      const checkIns = await prisma.checkIn.findMany({ where: { userId: sheet.ownerId } });

      for (const goal of sheet.goals) {
        for (const quarter of quarters) {
          const achievement = goal.achievements.find((item) => item.quarter === quarter);
          const checkIn = checkIns.find((item) => item.quarter === quarter);

          rows.push([
            sheet.owner.name,
            sheet.owner.email,
            sheet.owner.manager?.name || '',
            sheet.status,
            quarter,
            goal.title,
            goal.thrustArea,
            goal.uomType,
            goal.targetValue || '',
            achievement?.actualValue || '',
            achievement?.status || '',
            roundScore(achievement?.progressScore),
            goal.weight,
            roundScore(achievement?.weightedScore),
            achievement?.employeeNote || '',
            checkIn?.status || 'PENDING',
            checkIn?.comment || ''
          ]);
        }
      }
    }

    const csv = rows.map((row) => row.map(csvValue).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="atomgoals-achievement-report.csv"');
    return res.send(csv);
  } catch (error) {
    return next(error);
  }
});

export default router;
