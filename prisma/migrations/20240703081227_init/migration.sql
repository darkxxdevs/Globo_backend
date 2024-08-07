-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(60) NOT NULL,
    `avatar` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `coverImage` VARCHAR(191) NULL,
    `refreshToken` VARCHAR(1000) NULL,

    UNIQUE INDEX `User_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserPreferences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proUser` BOOLEAN NOT NULL DEFAULT false,
    `avatar` VARCHAR(191) NULL,
    `articleCount` INTEGER NOT NULL DEFAULT 0,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `UserPreferences_id_key`(`id`),
    UNIQUE INDEX `UserPreferences_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Article` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(100) NOT NULL,
    `content` VARCHAR(1000) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `userId` INTEGER NOT NULL,
    `image` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL DEFAULT '',

    UNIQUE INDEX `Article_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserPreferences` ADD CONSTRAINT `UserPreferences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Article` ADD CONSTRAINT `Article_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
