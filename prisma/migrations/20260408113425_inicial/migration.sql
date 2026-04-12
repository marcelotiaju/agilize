-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    INDEX `Account_userId_idx`(`userId`),
    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(0) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(0) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `login` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `emailVerified` DATETIME(0) NULL,
    `image` TEXT NULL,
    `phone` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `validFrom` DATETIME(0) NOT NULL,
    `validTo` DATETIME(0) NOT NULL,
    `historyDays` INTEGER NOT NULL DEFAULT 30,
    `maxRetroactiveDays` INTEGER NOT NULL DEFAULT 30,
    `maxRetroactiveDaysEdit` INTEGER NOT NULL DEFAULT 30,
    `defaultPage` VARCHAR(191) NOT NULL DEFAULT '/dashboard',
    `forceLogoutAt` DATETIME(0) NULL,
    `profileId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    UNIQUE INDEX `User_login_key`(`login`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Profile` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `canExport` BOOLEAN NOT NULL DEFAULT false,
    `canDelete` BOOLEAN NOT NULL DEFAULT false,
    `canLaunchVote` BOOLEAN NOT NULL DEFAULT false,
    `canLaunchEbd` BOOLEAN NOT NULL DEFAULT false,
    `canLaunchCampaign` BOOLEAN NOT NULL DEFAULT false,
    `canLaunchTithe` BOOLEAN NOT NULL DEFAULT false,
    `canLaunchExpense` BOOLEAN NOT NULL DEFAULT false,
    `canLaunchMission` BOOLEAN NOT NULL DEFAULT false,
    `canLaunchCircle` BOOLEAN NOT NULL DEFAULT false,
    `canLaunchServiceOffer` BOOLEAN NOT NULL DEFAULT false,
    `canLaunchCarneReviver` BOOLEAN NOT NULL DEFAULT false,
    `canLaunchCarneAfrica` BOOLEAN NOT NULL DEFAULT false,
    `canLaunchRendaBruta` BOOLEAN NOT NULL DEFAULT false,
    `canApproveVote` BOOLEAN NOT NULL DEFAULT false,
    `canApproveEbd` BOOLEAN NOT NULL DEFAULT false,
    `canApproveCampaign` BOOLEAN NOT NULL DEFAULT false,
    `canApproveTithe` BOOLEAN NOT NULL DEFAULT false,
    `canApproveExpense` BOOLEAN NOT NULL DEFAULT false,
    `canApproveMission` BOOLEAN NOT NULL DEFAULT false,
    `canApproveCircle` BOOLEAN NOT NULL DEFAULT false,
    `canApproveServiceOffer` BOOLEAN NOT NULL DEFAULT false,
    `canApproveCarneReviver` BOOLEAN NOT NULL DEFAULT false,
    `canApproveCarneAfrica` BOOLEAN NOT NULL DEFAULT false,
    `canApproveRendaBruta` BOOLEAN NOT NULL DEFAULT false,
    `canCreate` BOOLEAN NOT NULL DEFAULT false,
    `canEdit` BOOLEAN NOT NULL DEFAULT false,
    `canExclude` BOOLEAN NOT NULL DEFAULT false,
    `canListSummary` BOOLEAN NOT NULL DEFAULT false,
    `canGenerateSummary` BOOLEAN NOT NULL DEFAULT false,
    `canManageSummary` BOOLEAN NOT NULL DEFAULT false,
    `canApproveTreasury` BOOLEAN NOT NULL DEFAULT false,
    `canApproveAccountant` BOOLEAN NOT NULL DEFAULT false,
    `canApproveDirector` BOOLEAN NOT NULL DEFAULT false,
    `canManageUsers` BOOLEAN NOT NULL DEFAULT false,
    `canReportLaunches` BOOLEAN NOT NULL DEFAULT false,
    `canReportContributors` BOOLEAN NOT NULL DEFAULT false,
    `canReportSummary` BOOLEAN NOT NULL DEFAULT false,
    `canReportMonthlySummary` BOOLEAN NOT NULL DEFAULT false,
    `canReportHistoryContribSynthetic` BOOLEAN NOT NULL DEFAULT false,
    `canReportHistoryContribAnalytic` BOOLEAN NOT NULL DEFAULT false,
    `canReportAudit` BOOLEAN NOT NULL DEFAULT false,
    `canReportAccountability` BOOLEAN NOT NULL DEFAULT false,
    `canDeleteLaunch` BOOLEAN NOT NULL DEFAULT false,
    `canImportLaunch` BOOLEAN NOT NULL DEFAULT false,
    `canDeleteSummary` BOOLEAN NOT NULL DEFAULT false,
    `canTechnicalIntervention` BOOLEAN NOT NULL DEFAULT false,
    `canManageBankIntegration` BOOLEAN NOT NULL DEFAULT false,
    `canBankIntegrationConfigure` BOOLEAN NOT NULL DEFAULT false,
    `canBankIntegrationExecute` BOOLEAN NOT NULL DEFAULT false,
    `defaultLaunchType` VARCHAR(191) NULL DEFAULT 'DIZIMO',
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    UNIQUE INDEX `Profile_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentMethod` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinancialEntity` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `congregationId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    INDEX `FinancialEntity_congregationId_idx`(`congregationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankIntegrationConfig` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `financialEntityId` INTEGER NOT NULL,
    `paymentMethodId` INTEGER NOT NULL,
    `accountPlan` VARCHAR(191) NULL,
    `launchType` VARCHAR(191) NOT NULL,
    `launchTypeSource` VARCHAR(191) NOT NULL DEFAULT 'FIXED',
    `congregationSource` VARCHAR(191) NOT NULL DEFAULT 'FIXED',
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    UNIQUE INDEX `BankIntegrationConfig_code_key`(`code`),
    INDEX `BankIntegrationConfig_financialEntityId_idx`(`financialEntityId`),
    INDEX `BankIntegrationConfig_paymentMethodId_idx`(`paymentMethodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SourceFileColumn` (
    `id` VARCHAR(191) NOT NULL,
    `configId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    INDEX `SourceFileColumn_configId_idx`(`configId`),
    UNIQUE INDEX `SourceFileColumn_configId_code_key`(`configId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DestinationFileColumn` (
    `id` VARCHAR(191) NOT NULL,
    `configId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `transformation` TEXT NULL,

    INDEX `DestinationFileColumn_configId_idx`(`configId`),
    UNIQUE INDEX `DestinationFileColumn_configId_code_key`(`configId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LaunchIntegrationRule` (
    `id` VARCHAR(191) NOT NULL,
    `configId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `transformation` JSON NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    INDEX `LaunchIntegrationRule_configId_idx`(`configId`),
    UNIQUE INDEX `LaunchIntegrationRule_configId_code_key`(`configId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Congregation` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `regionalName` VARCHAR(191) NULL,
    `entradaOfferAccountPlan` VARCHAR(191) NULL,
    `entradaOfferFinancialEntity` VARCHAR(191) NULL,
    `entradaOfferPaymentMethod` VARCHAR(191) NULL,
    `entradaEbdAccountPlan` VARCHAR(191) NULL,
    `entradaEbdFinancialEntity` VARCHAR(191) NULL,
    `entradaEbdPaymentMethod` VARCHAR(191) NULL,
    `entradaCampaignAccountPlan` VARCHAR(191) NULL,
    `entradaCampaignFinancialEntity` VARCHAR(191) NULL,
    `entradaCampaignPaymentMethod` VARCHAR(191) NULL,
    `entradaVotesAccountPlan` VARCHAR(191) NULL,
    `entradaVotesFinancialEntity` VARCHAR(191) NULL,
    `entradaVotesPaymentMethod` VARCHAR(191) NULL,
    `entradaCarneReviverAccountPlan` VARCHAR(191) NULL,
    `entradaCarneReviverFinancialEntity` VARCHAR(191) NULL,
    `entradaCarneReviverPaymentMethod` VARCHAR(191) NULL,
    `dizimoAccountPlan` VARCHAR(191) NULL,
    `dizimoFinancialEntity` VARCHAR(191) NULL,
    `dizimoPaymentMethod` VARCHAR(191) NULL,
    `saidaFinancialEntity` VARCHAR(191) NULL,
    `saidaPaymentMethod` VARCHAR(191) NULL,
    `missionAccountPlan` VARCHAR(191) NULL,
    `missionFinancialEntity` VARCHAR(191) NULL,
    `missionPaymentMethod` VARCHAR(191) NULL,
    `circleAccountPlan` VARCHAR(191) NULL,
    `circleFinancialEntity` VARCHAR(191) NULL,
    `circlePaymentMethod` VARCHAR(191) NULL,
    `matriculaEnergisa` VARCHAR(191) NULL,
    `matriculaIgua` VARCHAR(191) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    UNIQUE INDEX `Congregation_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserCongregation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `congregationId` VARCHAR(191) NOT NULL,

    INDEX `UserCongregation_userId_idx`(`userId`),
    INDEX `UserCongregation_congregationId_idx`(`congregationId`),
    UNIQUE INDEX `UserCongregation_userId_congregationId_key`(`userId`, `congregationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Launch` (
    `id` VARCHAR(191) NOT NULL,
    `congregationId` VARCHAR(191) NOT NULL,
    `type` ENUM('DIZIMO', 'VOTO', 'EBD', 'CAMPANHA', 'OFERTA_CULTO', 'MISSAO', 'CIRCULO', 'ENTRADA', 'SAIDA', 'CARNE_REVIVER', 'CARNE_AFRICA', 'RENDA_BRUTA') NOT NULL,
    `date` DATETIME(0) NOT NULL,
    `talonNumber` VARCHAR(191) NULL,
    `value` DOUBLE NULL DEFAULT 0,
    `description` VARCHAR(255) NULL,
    `isRateio` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('NORMAL', 'CANCELED', 'APPROVED', 'EXPORTED', 'IMPORTED', 'INTEGRATED') NOT NULL DEFAULT 'NORMAL',
    `attachmentUrl` TEXT NULL,
    `contributorId` VARCHAR(191) NULL,
    `contributorName` VARCHAR(191) NULL,
    `supplierId` VARCHAR(191) NULL,
    `supplierName` VARCHAR(191) NULL,
    `classificationId` VARCHAR(191) NULL,
    `summaryId` VARCHAR(191) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `cancelledBy` VARCHAR(191) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `approvedByTreasury` VARCHAR(191) NULL,
    `approvedAtTreasury` DATETIME(3) NULL,
    `approvedByAccountant` VARCHAR(191) NULL,
    `approvedAtAccountant` DATETIME(3) NULL,
    `approvedByDirector` VARCHAR(191) NULL,
    `approvedAtDirector` DATETIME(3) NULL,
    `approvedVia` VARCHAR(191) NULL,
    `isIntegrated` BOOLEAN NOT NULL DEFAULT false,
    `integrationBatchId` VARCHAR(191) NULL,
    `financialEntityId` INTEGER NULL,
    `paymentMethodId` INTEGER NULL,

    INDEX `Launch_financialEntityId_idx`(`financialEntityId`),
    INDEX `Launch_congregationId_idx`(`congregationId`),
    INDEX `Launch_summaryId_idx`(`summaryId`),
    INDEX `Launch_contributorId_idx`(`contributorId`),
    INDEX `Launch_supplierId_idx`(`supplierId`),
    INDEX `Launch_classificationId_idx`(`classificationId`),
    INDEX `Launch_integrationBatchId_idx`(`integrationBatchId`),
    INDEX `Launch_paymentMethodId_idx`(`paymentMethodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contributor` (
    `id` VARCHAR(191) NOT NULL,
    `congregationId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `cpf` VARCHAR(191) NULL,
    `ecclesiasticalPosition` VARCHAR(191) NULL,
    `tipo` ENUM('CONGREGADO', 'MEMBRO') NULL,
    `photoUrl` TEXT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    UNIQUE INDEX `Contributor_code_key`(`code`),
    INDEX `Contributor_congregationId_idx`(`congregationId`),
    UNIQUE INDEX `Contributor_congregationId_code_name_key`(`congregationId`, `code`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `razaoSocial` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `tipoPessoa` ENUM('FISICA', 'JURIDICA') NULL,
    `cpfCnpj` VARCHAR(191) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    UNIQUE INDEX `Supplier_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Classification` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `shortCode` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    UNIQUE INDEX `Classification_code_key`(`code`),
    UNIQUE INDEX `Classification_shortCode_key`(`shortCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CongregationSummary` (
    `id` VARCHAR(191) NOT NULL,
    `congregationId` VARCHAR(191) NOT NULL,
    `date` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `startDate` DATETIME(0) NOT NULL,
    `endDate` DATETIME(0) NOT NULL,
    `launchCount` INTEGER NOT NULL DEFAULT 0,
    `entryTotal` DOUBLE NOT NULL DEFAULT 0,
    `titheTotal` DOUBLE NOT NULL DEFAULT 0,
    `exitTotal` DOUBLE NOT NULL DEFAULT 0,
    `offerTotal` DOUBLE NOT NULL DEFAULT 0,
    `votesTotal` DOUBLE NOT NULL DEFAULT 0,
    `ebdTotal` DOUBLE NOT NULL DEFAULT 0,
    `campaignTotal` DOUBLE NOT NULL DEFAULT 0,
    `missionTotal` DOUBLE NOT NULL DEFAULT 0,
    `circleTotal` DOUBLE NOT NULL DEFAULT 0,
    `carneReviverTotal` DOUBLE NOT NULL DEFAULT 0,
    `exitValue` DOUBLE NOT NULL DEFAULT 0,
    `talonNumber` VARCHAR(191) NULL,
    `depositValue` DOUBLE NOT NULL DEFAULT 0,
    `cashValue` DOUBLE NOT NULL DEFAULT 0,
    `totalValue` DOUBLE NOT NULL DEFAULT 0,
    `summaryType` VARCHAR(191) NULL,
    `treasurerApproved` BOOLEAN NOT NULL DEFAULT false,
    `accountantApproved` BOOLEAN NOT NULL DEFAULT false,
    `directorApproved` BOOLEAN NOT NULL DEFAULT false,
    `approvedByTreasury` VARCHAR(191) NULL,
    `approvedAtTreasury` DATETIME(3) NULL,
    `approvedByAccountant` VARCHAR(191) NULL,
    `approvedAtAccountant` DATETIME(3) NULL,
    `approvedByDirector` VARCHAR(191) NULL,
    `approvedAtDirector` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'APPROVED') NOT NULL DEFAULT 'PENDING',
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankIntegrationBatch` (
    `id` VARCHAR(191) NOT NULL,
    `sequentialNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `configId` VARCHAR(191) NOT NULL,
    `financialEntityId` INTEGER NOT NULL,
    `paymentMethodId` INTEGER NOT NULL,
    `importedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `importedByUserId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `fileName` VARCHAR(191) NULL,

    UNIQUE INDEX `BankIntegrationBatch_sequentialNumber_key`(`sequentialNumber`),
    INDEX `BankIntegrationBatch_configId_idx`(`configId`),
    INDEX `BankIntegrationBatch_financialEntityId_idx`(`financialEntityId`),
    INDEX `BankIntegrationBatch_paymentMethodId_idx`(`paymentMethodId`),
    INDEX `BankIntegrationBatch_importedByUserId_idx`(`importedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankIntegrationRow` (
    `id` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `rowIndex` INTEGER NOT NULL,
    `sourceData` TEXT NOT NULL,
    `destinationData` TEXT NULL,
    `isValid` BOOLEAN NOT NULL DEFAULT true,
    `errorMsg` TEXT NULL,
    `isIntegrated` BOOLEAN NOT NULL DEFAULT false,
    `launchId` VARCHAR(191) NULL,
    `contributorId` VARCHAR(191) NULL,
    `contributorName` VARCHAR(191) NULL,

    UNIQUE INDEX `BankIntegrationRow_launchId_key`(`launchId`),
    INDEX `BankIntegrationRow_batchId_idx`(`batchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `Profile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialEntity` ADD CONSTRAINT `FinancialEntity_congregationId_fkey` FOREIGN KEY (`congregationId`) REFERENCES `Congregation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankIntegrationConfig` ADD CONSTRAINT `BankIntegrationConfig_financialEntityId_fkey` FOREIGN KEY (`financialEntityId`) REFERENCES `FinancialEntity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankIntegrationConfig` ADD CONSTRAINT `BankIntegrationConfig_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `PaymentMethod`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SourceFileColumn` ADD CONSTRAINT `SourceFileColumn_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `BankIntegrationConfig`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DestinationFileColumn` ADD CONSTRAINT `DestinationFileColumn_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `BankIntegrationConfig`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaunchIntegrationRule` ADD CONSTRAINT `LaunchIntegrationRule_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `BankIntegrationConfig`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCongregation` ADD CONSTRAINT `UserCongregation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCongregation` ADD CONSTRAINT `UserCongregation_congregationId_fkey` FOREIGN KEY (`congregationId`) REFERENCES `Congregation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Launch` ADD CONSTRAINT `Launch_congregationId_fkey` FOREIGN KEY (`congregationId`) REFERENCES `Congregation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Launch` ADD CONSTRAINT `Launch_contributorId_fkey` FOREIGN KEY (`contributorId`) REFERENCES `Contributor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Launch` ADD CONSTRAINT `Launch_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Launch` ADD CONSTRAINT `Launch_classificationId_fkey` FOREIGN KEY (`classificationId`) REFERENCES `Classification`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Launch` ADD CONSTRAINT `Launch_summaryId_fkey` FOREIGN KEY (`summaryId`) REFERENCES `CongregationSummary`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Launch` ADD CONSTRAINT `Launch_integrationBatchId_fkey` FOREIGN KEY (`integrationBatchId`) REFERENCES `BankIntegrationBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Launch` ADD CONSTRAINT `Launch_financialEntityId_fkey` FOREIGN KEY (`financialEntityId`) REFERENCES `FinancialEntity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Launch` ADD CONSTRAINT `Launch_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `PaymentMethod`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contributor` ADD CONSTRAINT `Contributor_congregationId_fkey` FOREIGN KEY (`congregationId`) REFERENCES `Congregation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CongregationSummary` ADD CONSTRAINT `CongregationSummary_congregationId_fkey` FOREIGN KEY (`congregationId`) REFERENCES `Congregation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankIntegrationBatch` ADD CONSTRAINT `BankIntegrationBatch_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `BankIntegrationConfig`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankIntegrationBatch` ADD CONSTRAINT `BankIntegrationBatch_financialEntityId_fkey` FOREIGN KEY (`financialEntityId`) REFERENCES `FinancialEntity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankIntegrationBatch` ADD CONSTRAINT `BankIntegrationBatch_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `PaymentMethod`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankIntegrationBatch` ADD CONSTRAINT `BankIntegrationBatch_importedByUserId_fkey` FOREIGN KEY (`importedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankIntegrationRow` ADD CONSTRAINT `BankIntegrationRow_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `BankIntegrationBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
