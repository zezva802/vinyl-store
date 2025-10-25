import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDiscogsFields1761365365309 implements MigrationInterface {
    name = 'AddDiscogsFields1761365365309'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`vinyls\` ADD \`discogsId\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`vinyls\` ADD \`discogsScore\` decimal(3,2) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`vinyls\` DROP COLUMN \`discogsScore\``);
        await queryRunner.query(`ALTER TABLE \`vinyls\` DROP COLUMN \`discogsId\``);
    }

}
