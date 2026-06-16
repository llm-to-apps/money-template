CREATE TABLE `Wallet` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` ENUM('CARD', 'CASH', 'BANK', 'SAVINGS', 'CRYPTO', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `color` VARCHAR(191) NOT NULL DEFAULT '#059669',
  `initialBalanceCents` INTEGER NOT NULL DEFAULT 0,
  `isArchived` BOOLEAN NOT NULL DEFAULT false,
  `archivedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Wallet_name_key`(`name`),
  INDEX `Wallet_isArchived_idx`(`isArchived`),
  INDEX `Wallet_type_idx`(`type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `Wallet` (`id`, `name`, `type`, `currency`, `color`, `initialBalanceCents`, `isArchived`, `createdAt`, `updatedAt`)
VALUES ('local-default-wallet', 'Main Card', 'CARD', 'USD', '#059669', 0, false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

ALTER TABLE `Category`
  ADD COLUMN `scope` ENUM('INCOME', 'EXPENSE', 'BOTH') NOT NULL DEFAULT 'BOTH',
  ADD COLUMN `parentId` VARCHAR(191) NULL,
  ADD COLUMN `isArchived` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `archivedAt` DATETIME(3) NULL,
  ADD INDEX `Category_parentId_idx`(`parentId`),
  ADD INDEX `Category_isArchived_idx`(`isArchived`),
  ADD INDEX `Category_scope_idx`(`scope`);

ALTER TABLE `Transaction`
  ADD COLUMN `walletId` VARCHAR(191) NOT NULL DEFAULT 'local-default-wallet',
  ADD INDEX `Transaction_walletId_idx`(`walletId`);

ALTER TABLE `Category`
  ADD CONSTRAINT `Category_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Transaction`
  ADD CONSTRAINT `Transaction_walletId_fkey`
  FOREIGN KEY (`walletId`) REFERENCES `Wallet`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
