import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGithubUsernameToUser1660000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('intern_app_users', new TableColumn({
      name: 'githubUsername',
      type: 'varchar',
      isNullable: true,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('intern_app_users', 'githubUsername');
  }
}
