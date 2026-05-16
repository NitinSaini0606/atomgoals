import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

const router = express.Router();
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

const ensureCurrentGoalSheet = async (tx, userId) => {
  const { quarter, year } = getCurrentQuarter();
  const { startDate, endDate } = getQuarterDates(quarter, year);

  const cycle = await tx.goalCycle.upsert({
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

  return tx.goalSheet.upsert({
    where: { ownerId_cycleId: { ownerId: userId, cycleId: cycle.id } },
    update: {},
    create: {
      ownerId: userId,
      cycleId: cycle.id,
      status: 'DRAFT'
    },
    include: { goals: true }
  });
};

const getAssignableEmployees = async (user) => {
  if (user.role === 'ADMIN') {
    return prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
      select: { id: true, name: true, email: true, managerId: true },
      orderBy: { name: 'asc' }
    });
  }

  return prisma.user.findMany({
    where: { role: 'EMPLOYEE', managerId: Number(user.sub), isActive: true },
    select: { id: true, name: true, email: true, managerId: true },
    orderBy: { name: 'asc' }
  });
};

const validatePayload = async (body, user) => {
  const errors = [];
  const assignedEmployeeIds = [...new Set((body.assignedEmployeeIds || []).map(Number).filter(Boolean))];
  const primaryOwnerId = Number(body.primaryOwnerId);

  if (!body.thrustArea?.trim()) errors.push('Thrust Area is required.');
  if (!body.title?.trim()) errors.push('Goal Title is required.');
  if (!uomTypes.includes(body.uomType)) errors.push('Select a valid UoM Type.');
  if (!scoreDirections.includes(body.scoreDirection)) errors.push('Select a valid Score Direction.');
  if (!String(body.targetValue ?? '').trim()) errors.push('Target Value is required.');
  if (body.uomType === 'TIMELINE' && !body.deadline) errors.push('Timeline shared goals require a deadline.');
  if (assignedEmployeeIds.length === 0) errors.push('Assigned Employees are required.');
  if (!primaryOwnerId || !assignedEmployeeIds.includes(primaryOwnerId)) {
    errors.push('Primary Owner must be one of the assigned employees.');
  }

  const assignableEmployees = await getAssignableEmployees(user);
  const assignableIds = new Set(assignableEmployees.map((employee) => employee.id));
  const outOfScope = assignedEmployeeIds.some((id) => !assignableIds.has(id));

  if (outOfScope) {
    errors.push('One or more assigned employees are outside your allowed scope.');
  }

  return { errors, assignedEmployeeIds };
};

router.use(requireAuth, requireRole('ADMIN', 'MANAGER'));

router.get('/', async (req, res, next) => {
  try {
    const where = req.user.role === 'ADMIN'
      ? {}
      : { ownerId: Number(req.user.sub) };

    const [sharedGoals, employees] = await Promise.all([
      prisma.sharedGoal.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, role: true } },
          primaryOwner: { select: { id: true, name: true, email: true } },
          members: { select: { id: true, name: true, email: true } },
          goals: { select: { id: true, ownerId: true, weight: true, status: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      getAssignableEmployees(req.user)
    ]);

    return res.json({ sharedGoals, assignableEmployees: employees });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const sharedGoal = await prisma.sharedGoal.findFirst({
      where: {
        id: Number(req.params.id),
        ...(req.user.role === 'MANAGER' ? { ownerId: Number(req.user.sub) } : {})
      },
      include: {
        primaryOwner: { select: { id: true, name: true, email: true } },
        members: { select: { id: true, name: true, email: true } },
        goals: true
      }
    });

    if (!sharedGoal) {
      return res.status(404).json({ message: 'Shared Goal not found.' });
    }

    return res.json({ sharedGoal });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { errors, assignedEmployeeIds } = await validatePayload(req.body, req.user);

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Please fix the Shared Goal details.', errors });
    }

    const sharedGoal = await prisma.$transaction(async (tx) => {
      const firstSheet = await ensureCurrentGoalSheet(tx, assignedEmployeeIds[0]);

      const created = await tx.sharedGoal.create({
        data: {
          thrustArea: req.body.thrustArea.trim(),
          title: req.body.title.trim(),
          description: req.body.description?.trim() || null,
          uomType: req.body.uomType,
          scoreDirection: req.body.scoreDirection,
          targetValue: String(req.body.targetValue).trim(),
          deadline: req.body.deadline ? new Date(req.body.deadline) : null,
          ownerId: Number(req.user.sub),
          primaryOwnerId: Number(req.body.primaryOwnerId),
          cycleId: firstSheet.cycleId,
          members: {
            connect: assignedEmployeeIds.map((id) => ({ id }))
          }
        }
      });

      for (const employeeId of assignedEmployeeIds) {
        const sheet = await ensureCurrentGoalSheet(tx, employeeId);

        if (!['DRAFT', 'REVISION_REQUESTED'].includes(sheet.status)) {
          throw new Error('Shared Goals can only be assigned to draft or revision requested Goal Sheets.');
        }

        await tx.goal.create({
          data: {
            thrustArea: created.thrustArea,
            title: created.title,
            description: created.description,
            uomType: created.uomType,
            scoreDirection: created.scoreDirection,
            targetValue: created.targetValue,
            deadline: created.deadline,
            weight: 10,
            status: sheet.status,
            ownerId: employeeId,
            managerId: req.user.role === 'MANAGER' ? Number(req.user.sub) : null,
            cycleId: sheet.cycleId,
            goalSheetId: sheet.id,
            sharedGoalId: created.id
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: Number(req.user.sub),
          action: 'SHARED_GOAL_CREATED_AND_ASSIGNED',
          entityType: 'SharedGoal',
          entityId: created.id,
          details: {
            assignedEmployeeIds,
            primaryOwnerId: Number(req.body.primaryOwnerId)
          }
        }
      });

      return tx.sharedGoal.findUnique({
        where: { id: created.id },
        include: {
          primaryOwner: { select: { id: true, name: true, email: true } },
          members: { select: { id: true, name: true, email: true } },
          goals: true
        }
      });
    });

    return res.status(201).json({ sharedGoal });
  } catch (error) {
    if (error.message.includes('draft or revision')) {
      return res.status(409).json({ message: error.message });
    }

    return next(error);
  }
});

router.post('/:id/assign', async (_req, res) => {
  return res.status(501).json({ message: 'Use Shared Goal creation with Assigned Employees for this phase.' });
});

export default router;
