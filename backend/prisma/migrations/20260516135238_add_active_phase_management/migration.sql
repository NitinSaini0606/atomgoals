-- AlterTable
ALTER TABLE `goalcycle` ADD COLUMN `activePhase` ENUM('GOAL_SETTING', 'Q1', 'Q2', 'Q3', 'Q4') NOT NULL DEFAULT 'GOAL_SETTING';
