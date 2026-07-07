-- AlterTable
ALTER TABLE `sys_menu` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `sys_role` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `sys_user` ADD COLUMN `deleted_at` DATETIME(3) NULL;
