/*
  Warnings:

  - You are about to drop the column `description` on the `achievement` table. All the data in the column will be lost.
  - You are about to drop the column `evidenceUrl` on the `achievement` table. All the data in the column will be lost.
  - You are about to drop the column `impact` on the `achievement` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `achievement` table. All the data in the column will be lost.
  - You are about to drop the column `blockers` on the `checkin` table. All the data in the column will be lost.
  - You are about to drop the column `employeeComment` on the `checkin` table. All the data in the column will be lost.
  - You are about to drop the column `goalId` on the `checkin` table. All the data in the column will be lost.
  - You are about to drop the column `managerComment` on the `checkin` table. All the data in the column will be lost.
  - You are about to drop the column `progressPercent` on the `checkin` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `checkin` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[goalId,quarter]` on the table `Achievement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,managerId,quarter]` on the table `CheckIn` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `quarter` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `managerId` to the `CheckIn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quarter` to the `CheckIn` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `checkin` DROP FOREIGN KEY `CheckIn_cycleId_fkey`;

-- DropForeignKey
ALTER TABLE `checkin` DROP FOREIGN KEY `CheckIn_goalId_fkey`;

-- DropIndex
DROP INDEX `CheckIn_goalId_idx` ON `checkin`;

-- AlterTable
ALTER TABLE `achievement` DROP COLUMN `description`,
    DROP COLUMN `evidenceUrl`,
    DROP COLUMN `impact`,
    DROP COLUMN `title`,
    ADD COLUMN `actualValue` VARCHAR(191) NULL,
    ADD COLUMN `completionDate` DATETIME(3) NULL,
    ADD COLUMN `employeeNote` VARCHAR(191) NULL,
    ADD COLUMN `progressScore` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `quarter` VARCHAR(191) NOT NULL,
    ADD COLUMN `status` ENUM('NOT_STARTED', 'ON_TRACK', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN `weightedScore` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `checkin` DROP COLUMN `blockers`,
    DROP COLUMN `employeeComment`,
    DROP COLUMN `goalId`,
    DROP COLUMN `managerComment`,
    DROP COLUMN `progressPercent`,
    DROP COLUMN `summary`,
    ADD COLUMN `comment` VARCHAR(191) NULL,
    ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `managerId` INTEGER NOT NULL,
    ADD COLUMN `quarter` VARCHAR(191) NOT NULL,
    MODIFY `status` ENUM('DRAFT', 'SUBMITTED', 'REVIEWED', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
    MODIFY `cycleId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Achievement_quarter_idx` ON `Achievement`(`quarter`);

-- CreateIndex
CREATE UNIQUE INDEX `Achievement_goalId_quarter_key` ON `Achievement`(`goalId`, `quarter`);

-- CreateIndex
CREATE INDEX `CheckIn_managerId_idx` ON `CheckIn`(`managerId`);

-- CreateIndex
CREATE INDEX `CheckIn_quarter_idx` ON `CheckIn`(`quarter`);

-- CreateIndex
CREATE UNIQUE INDEX `CheckIn_userId_managerId_quarter_key` ON `CheckIn`(`userId`, `managerId`, `quarter`);

-- AddForeignKey
ALTER TABLE `CheckIn` ADD CONSTRAINT `CheckIn_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckIn` ADD CONSTRAINT `CheckIn_cycleId_fkey` FOREIGN KEY (`cycleId`) REFERENCES `GoalCycle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
