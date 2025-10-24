import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocalAuth1761305849631 implements MigrationInterface {
    name = 'AddLocalAuth1761305849631';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`users\` ADD \`password\` varchar(255) NULL`
        );
        await queryRunner.query(
            `ALTER TABLE \`users\` CHANGE \`googleId\` \`googleId\` varchar(255) NULL`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`users\` CHANGE \`googleId\` \`googleId\` varchar(255) NOT NULL`
        );
        await queryRunner.query(
            `ALTER TABLE \`users\` DROP COLUMN \`password\``
        );
    }
}
