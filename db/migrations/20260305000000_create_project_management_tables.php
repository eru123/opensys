<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateProjectManagementTables extends AbstractMigration
{
    public function up(): void
    {
        $this->execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                owner_id INT UNSIGNED NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY projects_owner_idx (owner_id),
                KEY projects_status_idx (status),
                CONSTRAINT projects_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->execute(
            "CREATE TABLE IF NOT EXISTS project_members (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                project_id INT UNSIGNED NOT NULL,
                user_id INT UNSIGNED NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'member',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY project_members_unique (project_id, user_id),
                KEY project_members_user_idx (user_id),
                CONSTRAINT project_members_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                CONSTRAINT project_members_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->execute(
            "CREATE TABLE IF NOT EXISTS project_tasks (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                project_id INT UNSIGNED NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'todo',
                priority VARCHAR(20) NOT NULL DEFAULT 'medium',
                assignee_id INT UNSIGNED NULL,
                due_date DATE NULL,
                position INT UNSIGNED NOT NULL DEFAULT 0,
                created_by INT UNSIGNED NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY project_tasks_project_idx (project_id),
                KEY project_tasks_assignee_idx (assignee_id),
                KEY project_tasks_status_idx (status),
                CONSTRAINT project_tasks_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                CONSTRAINT project_tasks_assignee_fk FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
                CONSTRAINT project_tasks_creator_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->execute(
            "CREATE TABLE IF NOT EXISTS project_milestones (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                project_id INT UNSIGNED NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                due_date DATE NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'open',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY project_milestones_project_idx (project_id),
                CONSTRAINT project_milestones_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->execute(
            "CREATE TABLE IF NOT EXISTS milestone_tasks (
                milestone_id INT UNSIGNED NOT NULL,
                task_id INT UNSIGNED NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (milestone_id, task_id),
                KEY milestone_tasks_task_idx (task_id),
                CONSTRAINT milestone_tasks_milestone_fk FOREIGN KEY (milestone_id) REFERENCES project_milestones(id) ON DELETE CASCADE,
                CONSTRAINT milestone_tasks_task_fk FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    }

    public function down(): void
    {
        $this->execute('DROP TABLE IF EXISTS milestone_tasks');
        $this->execute('DROP TABLE IF EXISTS project_milestones');
        $this->execute('DROP TABLE IF EXISTS project_tasks');
        $this->execute('DROP TABLE IF EXISTS project_members');
        $this->execute('DROP TABLE IF EXISTS projects');
    }
}
