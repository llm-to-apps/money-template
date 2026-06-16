-- Remove the wallet type classifier in favor of a free-form comment.
ALTER TABLE `Wallet` ADD COLUMN `comment` VARCHAR(191) NULL;
DROP INDEX `Wallet_type_idx` ON `Wallet`;
ALTER TABLE `Wallet` DROP COLUMN `type`;
