/*
  Warnings:

  - Added the required column `updated_at` to the `sys_menu` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `sys_role` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `sys_menu` ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `sys_role` ADD COLUMN `updated_at` DATETIME(3) NOT NULL;
