-- Convert wallet/category archive flags into an explicit business status.
ALTER TABLE `Wallet`
  ADD COLUMN `status` ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE';

UPDATE `Wallet`
SET `status` = CASE WHEN `isArchived` = true THEN 'ARCHIVED' ELSE 'ACTIVE' END;

DROP INDEX `Wallet_isArchived_idx` ON `Wallet`;

ALTER TABLE `Wallet`
  DROP COLUMN `archivedAt`,
  DROP COLUMN `isArchived`;

CREATE INDEX `Wallet_status_idx` ON `Wallet`(`status`);

ALTER TABLE `Category`
  ADD COLUMN `status` ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE';

UPDATE `Category`
SET `status` = CASE WHEN `isArchived` = true THEN 'ARCHIVED' ELSE 'ACTIVE' END;

DROP INDEX `Category_isArchived_idx` ON `Category`;

ALTER TABLE `Category`
  DROP COLUMN `archivedAt`,
  DROP COLUMN `isArchived`;

CREATE INDEX `Category_status_idx` ON `Category`(`status`);
