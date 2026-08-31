import { MigrationInterface, QueryRunner } from "typeorm";

export class DriftCheck1788172889214 implements MigrationInterface {
    name = 'DriftCheck1788172889214'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "goal_templates" DROP CONSTRAINT "FK_goal_templates_value_key"`);
        await queryRunner.query(`ALTER TABLE "user_values" DROP CONSTRAINT "FK_user_values_user_id"`);
        await queryRunner.query(`ALTER TABLE "user_values" DROP CONSTRAINT "FK_user_values_value_id"`);
        await queryRunner.query(`ALTER TABLE "habit_completions" DROP CONSTRAINT "FK_habit_completions_user_id"`);
        await queryRunner.query(`ALTER TABLE "habit_completions" DROP CONSTRAINT "FK_habit_completions_user_habit_id"`);
        await queryRunner.query(`ALTER TABLE "user_habits" DROP CONSTRAINT "FK_user_habits_user_id"`);
        await queryRunner.query(`ALTER TABLE "user_habits" DROP CONSTRAINT "FK_user_habits_source_template_id"`);
        await queryRunner.query(`ALTER TABLE "savings_entries" DROP CONSTRAINT "FK_savings_entries_user_id"`);
        await queryRunner.query(`ALTER TABLE "savings_entries" DROP CONSTRAINT "FK_savings_entries_user_goal_id"`);
        await queryRunner.query(`ALTER TABLE "user_goals" DROP CONSTRAINT "FK_user_goals_user_id"`);
        await queryRunner.query(`ALTER TABLE "user_goals" DROP CONSTRAINT "FK_user_goals_source_template_id"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP CONSTRAINT "FK_partners_pathway"`);
        await queryRunner.query(`ALTER TABLE "checklist_templates" DROP CONSTRAINT "FK_checklist_templates_pathway"`);
        await queryRunner.query(`ALTER TABLE "pathway_application_partners" DROP CONSTRAINT "FK_application_partners_application"`);
        await queryRunner.query(`ALTER TABLE "pathway_application_partners" DROP CONSTRAINT "FK_application_partners_partner"`);
        await queryRunner.query(`ALTER TABLE "pathway_applications" DROP CONSTRAINT "FK_pathway_applications_user"`);
        await queryRunner.query(`ALTER TABLE "pathway_applications" DROP CONSTRAINT "FK_pathway_applications_pathway"`);
        await queryRunner.query(`ALTER TABLE "pathway_checklist_items" DROP CONSTRAINT "FK_checklist_items_application"`);
        await queryRunner.query(`ALTER TABLE "pathway_checklist_items" DROP CONSTRAINT "FK_checklist_items_template"`);
        await queryRunner.query(`ALTER TABLE "goal_templates" ADD CONSTRAINT "FK_97f8a147e92723a900d283edd24" FOREIGN KEY ("value_key") REFERENCES "values"("key") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_values" ADD CONSTRAINT "FK_4eeefc61bb69e825089bafa829c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_values" ADD CONSTRAINT "FK_d89e22a83631e6b7ae736717286" FOREIGN KEY ("value_id") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "habit_completions" ADD CONSTRAINT "FK_61fb71e81144cfbfd4c466657f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "habit_completions" ADD CONSTRAINT "FK_c77d712edca4be0c7c705e06466" FOREIGN KEY ("user_habit_id") REFERENCES "user_habits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_habits" ADD CONSTRAINT "FK_d953d4f390cb541663eba5fa25a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_habits" ADD CONSTRAINT "FK_48f4393f4f1769e69332cb0c5b8" FOREIGN KEY ("source_template_id") REFERENCES "habit_templates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_entries" ADD CONSTRAINT "FK_0467dd7cea8f3991a9d6a9d492b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_entries" ADD CONSTRAINT "FK_c318bbd74232730998ebfd94519" FOREIGN KEY ("user_goal_id") REFERENCES "user_goals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_goals" ADD CONSTRAINT "FK_824aea29828f9c62c80fbe585ba" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_goals" ADD CONSTRAINT "FK_4366e8e1fd43c2787e6844f7b7a" FOREIGN KEY ("source_template_id") REFERENCES "goal_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partners" ADD CONSTRAINT "FK_f97a908a3b17fb496fb98dddb70" FOREIGN KEY ("pathway_key") REFERENCES "pathways"("key") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "checklist_templates" ADD CONSTRAINT "FK_3ea61ff1928e1d2ff8a732bf7bf" FOREIGN KEY ("pathway_key") REFERENCES "pathways"("key") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pathway_application_partners" ADD CONSTRAINT "FK_4b1d4d75ec9c25067cccbb1760a" FOREIGN KEY ("application_id") REFERENCES "pathway_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pathway_application_partners" ADD CONSTRAINT "FK_a715e2a372a74404a6b7c0d2974" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pathway_applications" ADD CONSTRAINT "FK_612a69e230fd5fc3d359e900fef" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pathway_applications" ADD CONSTRAINT "FK_d733d5bef81304f765360130c5d" FOREIGN KEY ("pathway_key") REFERENCES "pathways"("key") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pathway_checklist_items" ADD CONSTRAINT "FK_bae1b2fd1d18b0572d77f6a10ee" FOREIGN KEY ("application_id") REFERENCES "pathway_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pathway_checklist_items" ADD CONSTRAINT "FK_198e5c669af7c7a7561e3984c08" FOREIGN KEY ("checklist_template_id") REFERENCES "checklist_templates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pathway_checklist_items" DROP CONSTRAINT "FK_198e5c669af7c7a7561e3984c08"`);
        await queryRunner.query(`ALTER TABLE "pathway_checklist_items" DROP CONSTRAINT "FK_bae1b2fd1d18b0572d77f6a10ee"`);
        await queryRunner.query(`ALTER TABLE "pathway_applications" DROP CONSTRAINT "FK_d733d5bef81304f765360130c5d"`);
        await queryRunner.query(`ALTER TABLE "pathway_applications" DROP CONSTRAINT "FK_612a69e230fd5fc3d359e900fef"`);
        await queryRunner.query(`ALTER TABLE "pathway_application_partners" DROP CONSTRAINT "FK_a715e2a372a74404a6b7c0d2974"`);
        await queryRunner.query(`ALTER TABLE "pathway_application_partners" DROP CONSTRAINT "FK_4b1d4d75ec9c25067cccbb1760a"`);
        await queryRunner.query(`ALTER TABLE "checklist_templates" DROP CONSTRAINT "FK_3ea61ff1928e1d2ff8a732bf7bf"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP CONSTRAINT "FK_f97a908a3b17fb496fb98dddb70"`);
        await queryRunner.query(`ALTER TABLE "user_goals" DROP CONSTRAINT "FK_4366e8e1fd43c2787e6844f7b7a"`);
        await queryRunner.query(`ALTER TABLE "user_goals" DROP CONSTRAINT "FK_824aea29828f9c62c80fbe585ba"`);
        await queryRunner.query(`ALTER TABLE "savings_entries" DROP CONSTRAINT "FK_c318bbd74232730998ebfd94519"`);
        await queryRunner.query(`ALTER TABLE "savings_entries" DROP CONSTRAINT "FK_0467dd7cea8f3991a9d6a9d492b"`);
        await queryRunner.query(`ALTER TABLE "user_habits" DROP CONSTRAINT "FK_48f4393f4f1769e69332cb0c5b8"`);
        await queryRunner.query(`ALTER TABLE "user_habits" DROP CONSTRAINT "FK_d953d4f390cb541663eba5fa25a"`);
        await queryRunner.query(`ALTER TABLE "habit_completions" DROP CONSTRAINT "FK_c77d712edca4be0c7c705e06466"`);
        await queryRunner.query(`ALTER TABLE "habit_completions" DROP CONSTRAINT "FK_61fb71e81144cfbfd4c466657f4"`);
        await queryRunner.query(`ALTER TABLE "user_values" DROP CONSTRAINT "FK_d89e22a83631e6b7ae736717286"`);
        await queryRunner.query(`ALTER TABLE "user_values" DROP CONSTRAINT "FK_4eeefc61bb69e825089bafa829c"`);
        await queryRunner.query(`ALTER TABLE "goal_templates" DROP CONSTRAINT "FK_97f8a147e92723a900d283edd24"`);
        await queryRunner.query(`ALTER TABLE "pathway_checklist_items" ADD CONSTRAINT "FK_checklist_items_template" FOREIGN KEY ("checklist_template_id") REFERENCES "checklist_templates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pathway_checklist_items" ADD CONSTRAINT "FK_checklist_items_application" FOREIGN KEY ("application_id") REFERENCES "pathway_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pathway_applications" ADD CONSTRAINT "FK_pathway_applications_pathway" FOREIGN KEY ("pathway_key") REFERENCES "pathways"("key") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pathway_applications" ADD CONSTRAINT "FK_pathway_applications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pathway_application_partners" ADD CONSTRAINT "FK_application_partners_partner" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pathway_application_partners" ADD CONSTRAINT "FK_application_partners_application" FOREIGN KEY ("application_id") REFERENCES "pathway_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "checklist_templates" ADD CONSTRAINT "FK_checklist_templates_pathway" FOREIGN KEY ("pathway_key") REFERENCES "pathways"("key") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partners" ADD CONSTRAINT "FK_partners_pathway" FOREIGN KEY ("pathway_key") REFERENCES "pathways"("key") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_goals" ADD CONSTRAINT "FK_user_goals_source_template_id" FOREIGN KEY ("source_template_id") REFERENCES "goal_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_goals" ADD CONSTRAINT "FK_user_goals_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_entries" ADD CONSTRAINT "FK_savings_entries_user_goal_id" FOREIGN KEY ("user_goal_id") REFERENCES "user_goals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_entries" ADD CONSTRAINT "FK_savings_entries_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_habits" ADD CONSTRAINT "FK_user_habits_source_template_id" FOREIGN KEY ("source_template_id") REFERENCES "habit_templates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_habits" ADD CONSTRAINT "FK_user_habits_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "habit_completions" ADD CONSTRAINT "FK_habit_completions_user_habit_id" FOREIGN KEY ("user_habit_id") REFERENCES "user_habits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "habit_completions" ADD CONSTRAINT "FK_habit_completions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_values" ADD CONSTRAINT "FK_user_values_value_id" FOREIGN KEY ("value_id") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_values" ADD CONSTRAINT "FK_user_values_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "goal_templates" ADD CONSTRAINT "FK_goal_templates_value_key" FOREIGN KEY ("value_key") REFERENCES "values"("key") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
