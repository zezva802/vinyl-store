import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1760776213671 implements MigrationInterface {
    name = 'InitialSchema1760776213671';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`order_items\` (\`id\` varchar(36) NOT NULL, \`quantity\` int NOT NULL DEFAULT '1', \`priceAtPurchase\` decimal(10,2) NOT NULL, \`orderId\` varchar(255) NOT NULL, \`vinylId\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `CREATE TABLE \`orders\` (\`id\` varchar(36) NOT NULL, \`stripePaymentIntentId\` varchar(255) NOT NULL, \`status\` enum ('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending', \`totalAmount\` decimal(10,2) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`userId\` varchar(255) NOT NULL, INDEX \`IDX_30e6836e8539f85bfc47198067\` (\`userId\`, \`createdAt\`), UNIQUE INDEX \`IDX_5d0d9997b74ffe21230d302629\` (\`stripePaymentIntentId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`googleId\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`firstName\` varchar(255) NULL, \`lastName\` varchar(255) NULL, \`birthDate\` date NULL, \`avatar\` text NULL, \`role\` enum ('user', 'admin') NOT NULL DEFAULT 'user', \`isDeleted\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_f382af58ab36057334fb262efd\` (\`googleId\`), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `CREATE TABLE \`reviews\` (\`id\` varchar(36) NOT NULL, \`comment\` text NOT NULL, \`score\` tinyint UNSIGNED NOT NULL, \`isDeleted\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`userId\` varchar(255) NOT NULL, \`vinylId\` varchar(255) NOT NULL, INDEX \`IDX_ba4344ddf370d071e60873a694\` (\`userId\`, \`isDeleted\`), INDEX \`IDX_5d4f8aaaa638c797a69a9fcf79\` (\`vinylId\`, \`isDeleted\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `CREATE TABLE \`vinyls\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`authorName\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`price\` decimal(10,2) NOT NULL, \`imageUrl\` text NULL, \`isDeleted\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_8aa3621556e5255c6456c0970c\` (\`name\`), INDEX \`IDX_780ea1bdbe9562e53e651085d8\` (\`authorName\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `CREATE TABLE \`audit_logs\` (\`id\` varchar(36) NOT NULL, \`entityType\` varchar(255) NOT NULL, \`entityId\` varchar(255) NOT NULL, \`action\` enum ('create', 'update', 'delete') NOT NULL, \`changes\` json NULL, \`performedBy\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_a8bd8d95914d6228770fe87b8a\` (\`performedBy\`), INDEX \`IDX_cee5459245f652b75eb2759b4c\` (\`action\`), INDEX \`IDX_13c69424c440a0e765053feb4b\` (\`entityType\`, \`entityId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_f1d359a55923bb45b057fbdab0d\` FOREIGN KEY (\`orderId\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_4db37e49014aa43945846e12f31\` FOREIGN KEY (\`vinylId\`) REFERENCES \`vinyls\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE \`orders\` ADD CONSTRAINT \`FK_151b79a83ba240b0cb31b2302d1\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_7ed5659e7139fc8bc039198cc1f\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_824ac8e8ce880d78453bbdca9cb\` FOREIGN KEY (\`vinylId\`) REFERENCES \`vinyls\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_824ac8e8ce880d78453bbdca9cb\``
        );
        await queryRunner.query(
            `ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_7ed5659e7139fc8bc039198cc1f\``
        );
        await queryRunner.query(
            `ALTER TABLE \`orders\` DROP FOREIGN KEY \`FK_151b79a83ba240b0cb31b2302d1\``
        );
        await queryRunner.query(
            `ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_4db37e49014aa43945846e12f31\``
        );
        await queryRunner.query(
            `ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_f1d359a55923bb45b057fbdab0d\``
        );
        await queryRunner.query(
            `DROP INDEX \`IDX_13c69424c440a0e765053feb4b\` ON \`audit_logs\``
        );
        await queryRunner.query(
            `DROP INDEX \`IDX_cee5459245f652b75eb2759b4c\` ON \`audit_logs\``
        );
        await queryRunner.query(
            `DROP INDEX \`IDX_a8bd8d95914d6228770fe87b8a\` ON \`audit_logs\``
        );
        await queryRunner.query(`DROP TABLE \`audit_logs\``);
        await queryRunner.query(
            `DROP INDEX \`IDX_780ea1bdbe9562e53e651085d8\` ON \`vinyls\``
        );
        await queryRunner.query(
            `DROP INDEX \`IDX_8aa3621556e5255c6456c0970c\` ON \`vinyls\``
        );
        await queryRunner.query(`DROP TABLE \`vinyls\``);
        await queryRunner.query(
            `DROP INDEX \`IDX_5d4f8aaaa638c797a69a9fcf79\` ON \`reviews\``
        );
        await queryRunner.query(
            `DROP INDEX \`IDX_ba4344ddf370d071e60873a694\` ON \`reviews\``
        );
        await queryRunner.query(`DROP TABLE \`reviews\``);
        await queryRunner.query(
            `DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``
        );
        await queryRunner.query(
            `DROP INDEX \`IDX_f382af58ab36057334fb262efd\` ON \`users\``
        );
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(
            `DROP INDEX \`IDX_5d0d9997b74ffe21230d302629\` ON \`orders\``
        );
        await queryRunner.query(
            `DROP INDEX \`IDX_30e6836e8539f85bfc47198067\` ON \`orders\``
        );
        await queryRunner.query(`DROP TABLE \`orders\``);
        await queryRunner.query(`DROP TABLE \`order_items\``);
    }
}
