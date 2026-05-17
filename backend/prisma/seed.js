import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
const password = 'password123';

const q1Start = new Date('2026-04-01T00:00:00.000Z');
const q1End = new Date('2026-06-30T23:59:59.000Z');

async function ensureGoal({ owner, manager, cycle, goalSheet, data }) {
  const existing = await prisma.goal.findFirst({
    where: {
      ownerId: owner.id,
      cycleId: cycle.id,
      goalSheetId: goalSheet.id,
      title: data.title,
      sharedGoalId: null
    }
  });

  if (existing) {
    return prisma.goal.update({
      where: { id: existing.id },
      data: {
        ...data,
        ownerId: owner.id,
        managerId: manager.id,
        cycleId: cycle.id,
        goalSheetId: goalSheet.id,
        status: 'APPROVED_LOCKED'
      }
    });
  }

  return prisma.goal.create({
    data: {
      ...data,
      ownerId: owner.id,
      managerId: manager.id,
      cycleId: cycle.id,
      goalSheetId: goalSheet.id,
      status: 'APPROVED_LOCKED'
    }
  });
}

async function ensureSharedGoalInstance({ employee, manager, cycle, goalSheet, sharedGoal }) {
  const existing = await prisma.goal.findFirst({
    where: {
      ownerId: employee.id,
      goalSheetId: goalSheet.id,
      sharedGoalId: sharedGoal.id
    }
  });

  const data = {
    thrustArea: sharedGoal.thrustArea,
    title: sharedGoal.title,
    description: sharedGoal.description,
    uomType: sharedGoal.uomType,
    scoreDirection: sharedGoal.scoreDirection,
    targetValue: sharedGoal.targetValue,
    deadline: sharedGoal.deadline,
    weight: 20,
    status: 'APPROVED_LOCKED',
    ownerId: employee.id,
    managerId: manager.id,
    cycleId: cycle.id,
    goalSheetId: goalSheet.id,
    sharedGoalId: sharedGoal.id
  };

  if (existing) {
    return prisma.goal.update({ where: { id: existing.id }, data });
  }

  return prisma.goal.create({ data });
}

async function ensureAchievement({ goal, user, quarter, actualValue, status, progressScore, employeeNote }) {
  return prisma.achievement.upsert({
    where: { goalId_quarter: { goalId: goal.id, quarter } },
    update: {
      actualValue,
      status,
      employeeNote,
      progressScore,
      weightedScore: Number(((progressScore * Number(goal.weight)) / 100).toFixed(2))
    },
    create: {
      goalId: goal.id,
      userId: user.id,
      quarter,
      actualValue,
      status,
      employeeNote,
      progressScore,
      weightedScore: Number(((progressScore * Number(goal.weight)) / 100).toFixed(2))
    }
  });
}

async function ensureAuditLog({ actorId, action, entityType, entityId, details }) {
  const existing = await prisma.auditLog.findFirst({
    where: { actorId, action, entityType, entityId }
  });

  if (existing) return existing;

  return prisma.auditLog.create({
    data: { actorId, action, entityType, entityId, details }
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@atomgoals.com' },
    update: {
      name: 'AtomGoals Manager',
      passwordHash,
      role: UserRole.MANAGER,
      managerId: null,
      isActive: true
    },
    create: {
      employeeCode: 'MGR-001',
      name: 'AtomGoals Manager',
      email: 'manager@atomgoals.com',
      passwordHash,
      role: UserRole.MANAGER
    }
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@atomgoals.com' },
    update: {
      name: 'AtomGoals Employee',
      passwordHash,
      role: UserRole.EMPLOYEE,
      managerId: manager.id,
      isActive: true
    },
    create: {
      employeeCode: 'EMP-001',
      name: 'AtomGoals Employee',
      email: 'employee@atomgoals.com',
      passwordHash,
      role: UserRole.EMPLOYEE,
      managerId: manager.id
    }
  });

  const employeeTwo = await prisma.user.upsert({
    where: { email: 'employee2@atomgoals.com' },
    update: {
      name: 'AtomGoals Employee Two',
      passwordHash,
      role: UserRole.EMPLOYEE,
      managerId: manager.id,
      isActive: true
    },
    create: {
      employeeCode: 'EMP-002',
      name: 'AtomGoals Employee Two',
      email: 'employee2@atomgoals.com',
      passwordHash,
      role: UserRole.EMPLOYEE,
      managerId: manager.id
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@atomgoals.com' },
    update: {
      name: 'AtomGoals Admin',
      passwordHash,
      role: UserRole.ADMIN,
      managerId: null,
      isActive: true
    },
    create: {
      employeeCode: 'ADM-001',
      name: 'AtomGoals Admin',
      email: 'admin@atomgoals.com',
      passwordHash,
      role: UserRole.ADMIN
    }
  });

  const cycle = await prisma.goalCycle.upsert({
    where: { year_quarter: { year: 2026, quarter: 'Q1' } },
    update: {
      name: 'FY 2026 Goal Cycle',
      startDate: q1Start,
      endDate: q1End,
      status: 'ACTIVE',
      activePhase: 'Q1'
    },
    create: {
      name: 'FY 2026 Goal Cycle',
      quarter: 'Q1',
      year: 2026,
      startDate: q1Start,
      endDate: q1End,
      status: 'ACTIVE',
      activePhase: 'Q1'
    }
  });

  const employeeSheet = await prisma.goalSheet.upsert({
    where: { ownerId_cycleId: { ownerId: employee.id, cycleId: cycle.id } },
    update: {
      status: 'APPROVED_LOCKED',
      managerFeedback: null,
      submittedAt: new Date('2026-04-05T10:00:00.000Z'),
      reviewedAt: new Date('2026-04-06T10:00:00.000Z'),
      approvedAt: new Date('2026-04-06T10:00:00.000Z')
    },
    create: {
      ownerId: employee.id,
      cycleId: cycle.id,
      status: 'APPROVED_LOCKED',
      submittedAt: new Date('2026-04-05T10:00:00.000Z'),
      reviewedAt: new Date('2026-04-06T10:00:00.000Z'),
      approvedAt: new Date('2026-04-06T10:00:00.000Z')
    }
  });

  const employeeTwoSheet = await prisma.goalSheet.upsert({
    where: { ownerId_cycleId: { ownerId: employeeTwo.id, cycleId: cycle.id } },
    update: {
      status: 'APPROVED_LOCKED',
      managerFeedback: null,
      submittedAt: new Date('2026-04-05T11:00:00.000Z'),
      reviewedAt: new Date('2026-04-06T11:00:00.000Z'),
      approvedAt: new Date('2026-04-06T11:00:00.000Z')
    },
    create: {
      ownerId: employeeTwo.id,
      cycleId: cycle.id,
      status: 'APPROVED_LOCKED',
      submittedAt: new Date('2026-04-05T11:00:00.000Z'),
      reviewedAt: new Date('2026-04-06T11:00:00.000Z'),
      approvedAt: new Date('2026-04-06T11:00:00.000Z')
    }
  });

  const sharedGoal = await prisma.sharedGoal.upsert({
    where: { id: (await prisma.sharedGoal.findFirst({ where: { title: 'Improve Departmental KPI Completion', cycleId: cycle.id } }))?.id || 0 },
    update: {
      thrustArea: 'Departmental Productivity',
      description: 'Improve cross-team visibility and timely KPI completion for the quarter.',
      uomType: 'PERCENTAGE',
      scoreDirection: 'MIN',
      targetValue: '90',
      deadline: null,
      ownerId: manager.id,
      primaryOwnerId: employee.id,
      cycleId: cycle.id,
      status: 'ACTIVE',
      members: {
        set: [{ id: employee.id }, { id: employeeTwo.id }]
      }
    },
    create: {
      thrustArea: 'Departmental Productivity',
      title: 'Improve Departmental KPI Completion',
      description: 'Improve cross-team visibility and timely KPI completion for the quarter.',
      uomType: 'PERCENTAGE',
      scoreDirection: 'MIN',
      targetValue: '90',
      deadline: null,
      ownerId: manager.id,
      primaryOwnerId: employee.id,
      cycleId: cycle.id,
      status: 'ACTIVE',
      members: {
        connect: [{ id: employee.id }, { id: employeeTwo.id }]
      }
    }
  });

  const employeeSharedGoal = await ensureSharedGoalInstance({
    employee,
    manager,
    cycle,
    goalSheet: employeeSheet,
    sharedGoal
  });
  const employeeTwoSharedGoal = await ensureSharedGoalInstance({
    employee: employeeTwo,
    manager,
    cycle,
    goalSheet: employeeTwoSheet,
    sharedGoal
  });

  const employeeGoals = [
    employeeSharedGoal,
    await ensureGoal({
      owner: employee,
      manager,
      cycle,
      goalSheet: employeeSheet,
      data: {
        thrustArea: 'Customer Experience',
        title: 'Reduce Support Resolution Time',
        description: 'Improve average support resolution time for assigned cases.',
        uomType: 'NUMERIC',
        scoreDirection: 'MAX',
        targetValue: '24',
        deadline: null,
        weight: 40
      }
    }),
    await ensureGoal({
      owner: employee,
      manager,
      cycle,
      goalSheet: employeeSheet,
      data: {
        thrustArea: 'Process Excellence',
        title: 'Publish Monthly Process Audit',
        description: 'Complete and publish monthly process audit findings.',
        uomType: 'PERCENTAGE',
        scoreDirection: 'MIN',
        targetValue: '100',
        deadline: null,
        weight: 40
      }
    })
  ];

  const employeeTwoGoals = [
    employeeTwoSharedGoal,
    await ensureGoal({
      owner: employeeTwo,
      manager,
      cycle,
      goalSheet: employeeTwoSheet,
      data: {
        thrustArea: 'Operational Delivery',
        title: 'Improve Weekly Delivery Adherence',
        description: 'Improve weekly plan adherence for assigned workstream.',
        uomType: 'PERCENTAGE',
        scoreDirection: 'MIN',
        targetValue: '95',
        deadline: null,
        weight: 40
      }
    }),
    await ensureGoal({
      owner: employeeTwo,
      manager,
      cycle,
      goalSheet: employeeTwoSheet,
      data: {
        thrustArea: 'Team Collaboration',
        title: 'Complete Knowledge Transfer Plan',
        description: 'Complete all planned knowledge transfer sessions before quarter close.',
        uomType: 'TIMELINE',
        scoreDirection: 'NONE',
        targetValue: 'Completed',
        deadline: new Date('2026-06-20T00:00:00.000Z'),
        weight: 40
      }
    })
  ];

  for (const goal of employeeGoals) {
    await ensureAchievement({
      goal,
      user: employee,
      quarter: 'Q1',
      actualValue: goal.uomType === 'TIMELINE' ? 'Completed' : goal.targetValue,
      status: 'COMPLETED',
      progressScore: 100,
      employeeNote: 'Q1 demo achievement completed on track.'
    });
  }

  for (const goal of employeeTwoGoals) {
    await ensureAchievement({
      goal,
      user: employeeTwo,
      quarter: 'Q1',
      actualValue: goal.uomType === 'TIMELINE' ? 'Completed' : goal.targetValue,
      status: 'COMPLETED',
      progressScore: 100,
      employeeNote: 'Q1 demo achievement completed on track.'
    });
  }

  await prisma.checkIn.upsert({
    where: { userId_managerId_quarter: { userId: employee.id, managerId: manager.id, quarter: 'Q1' } },
    update: {
      comment: 'Q1 check-in completed. Goals are progressing as expected.',
      status: 'COMPLETED',
      completedAt: new Date('2026-05-01T10:00:00.000Z'),
      cycleId: cycle.id
    },
    create: {
      userId: employee.id,
      managerId: manager.id,
      quarter: 'Q1',
      comment: 'Q1 check-in completed. Goals are progressing as expected.',
      status: 'COMPLETED',
      completedAt: new Date('2026-05-01T10:00:00.000Z'),
      cycleId: cycle.id
    }
  });

  await prisma.checkIn.upsert({
    where: { userId_managerId_quarter: { userId: employeeTwo.id, managerId: manager.id, quarter: 'Q1' } },
    update: {
      comment: 'Q1 check-in completed. Employee Two is ready for the next milestone.',
      status: 'COMPLETED',
      completedAt: new Date('2026-05-01T11:00:00.000Z'),
      cycleId: cycle.id
    },
    create: {
      userId: employeeTwo.id,
      managerId: manager.id,
      quarter: 'Q1',
      comment: 'Q1 check-in completed. Employee Two is ready for the next milestone.',
      status: 'COMPLETED',
      completedAt: new Date('2026-05-01T11:00:00.000Z'),
      cycleId: cycle.id
    }
  });

  await ensureAuditLog({
    actorId: employee.id,
    action: 'GOAL_SHEET_SUBMITTED',
    entityType: 'GoalSheet',
    entityId: employeeSheet.id,
    details: { employeeId: employee.id }
  });
  await ensureAuditLog({
    actorId: manager.id,
    action: 'MANAGER_APPROVED_AND_LOCKED_GOAL_SHEET',
    entityType: 'GoalSheet',
    entityId: employeeSheet.id,
    details: { employeeId: employee.id }
  });
  await ensureAuditLog({
    actorId: manager.id,
    action: 'SHARED_GOAL_CREATED_AND_ASSIGNED',
    entityType: 'SharedGoal',
    entityId: sharedGoal.id,
    details: { assignedEmployeeIds: [employee.id, employeeTwo.id], primaryOwnerId: employee.id }
  });
  await ensureAuditLog({
    actorId: manager.id,
    action: 'MANAGER_COMPLETED_QUARTERLY_CHECKIN',
    entityType: 'CheckIn',
    entityId: employee.id,
    details: { employeeId: employee.id, quarter: 'Q1' }
  });
  await ensureAuditLog({
    actorId: admin.id,
    action: 'ADMIN_CHANGED_ACTIVE_PHASE',
    entityType: 'GoalCycle',
    entityId: cycle.id,
    details: { oldPhase: 'GOAL_SETTING', newPhase: 'Q1' }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Demo deployment data seeded without deleting existing data');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
