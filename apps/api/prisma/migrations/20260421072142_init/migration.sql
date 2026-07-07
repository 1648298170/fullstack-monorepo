-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(20) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(200) NOT NULL,
    `nickname` VARCHAR(100) NULL,
    `roles` VARCHAR(200) NOT NULL DEFAULT 'user',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
