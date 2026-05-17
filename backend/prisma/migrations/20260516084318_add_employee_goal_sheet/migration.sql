/*
  Warnings:

  - A unique constraint covering the columns `[year,quarter]` on the table `GoalCycle` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `goalSheetId` to the `Goal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thrustArea` to the `Goal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Goal` ADD COLUMN `deadline` DATETIME(3) NULL,
    ADD COLUMN `goalSheetId` INTEGER NOT NULL,
    ADD COLUMN `scoreDirection` ENUM('MIN', 'MAX', 'NONE') NOT NULL DEFAULT 'MIN',
    ADD COLUMN `targetValue` VARCHAR(191) NULL,
    ADD COLUMN `thrustArea` VARCHAR(191) NOT NULL,
    ADD COLUMN `uomType` ENUM('NUMERIC', 'PERCENTAGE', 'TIMELINE', 'ZERO_BASED') NOT NULL DEFAULT 'NUMERIC';

-- CreateTable
CREATE TABLE `GoalSheet` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ownerId` INTEGER NOT NULL,
    `cycleId` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GoalSheet_cycleId_idx`(`cycleId`),
    UNIQUE INDEX `GoalSheet_ownerId_cycleId_key`(`ownerId`, `cycleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Goal_goalSheetId_idx` ON `Goal`(`goalSheetId`);

-- CreateIndex
CREATE UNIQUE INDEX `GoalCycle_year_quarter_key` ON `GoalCycle`(`year`, `quarter`);

-- AddForeignKey
ALTER TABLE `GoalSheet` ADD CONSTRAINT `GoalSheet_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoalSheet` ADD CONSTRAINT `GoalSheet_cycleId_fkey` FOREIGN KEY (`cycleId`) REFERENCES `GoalCycle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Goal` ADD CONSTRAINT `Goal_goalSheetId_fkey` FOREIGN KEY (`goalSheetId`) REFERENCES `GoalSheet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
