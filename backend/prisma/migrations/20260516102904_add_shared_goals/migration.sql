/*
  Warnings:

  - Added the required column `primaryOwnerId` to the `SharedGoal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scoreDirection` to the `SharedGoal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetValue` to the `SharedGoal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thrustArea` to the `SharedGoal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uomType` to the `SharedGoal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `SharedGoal` ADD COLUMN `deadline` DATETIME(3) NULL,
    ADD COLUMN `primaryOwnerId` INTEGER NOT NULL,
    ADD COLUMN `scoreDirection` ENUM('MIN', 'MAX', 'NONE') NOT NULL,
    ADD COLUMN `targetValue` VARCHAR(191) NOT NULL,
    ADD COLUMN `thrustArea` VARCHAR(191) NOT NULL,
    ADD COLUMN `uomType` ENUM('NUMERIC', 'PERCENTAGE', 'TIMELINE', 'ZERO_BASED') NOT NULL;

-- CreateIndex
CREATE INDEX `SharedGoal_primaryOwnerId_idx` ON `SharedGoal`(`primaryOwnerId`);

-- AddForeignKey
ALTER TABLE `SharedGoal` ADD CONSTRAINT `SharedGoal_primaryOwnerId_fkey` FOREIGN KEY (`primaryOwnerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
