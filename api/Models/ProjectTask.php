<?php

declare(strict_types=1);

namespace Api\Models;

class ProjectTask extends BaseModel
{
    protected static string $table = 'project_tasks';

    protected function getFillable(): array
    {
        return ['project_id', 'title', 'description', 'status', 'priority', 'assignee_id', 'due_date', 'position', 'created_by', 'created_at', 'updated_at'];
    }

    protected function getHidden(): array
    {
        return [];
    }

    public function toArray(): array
    {
        $data = $this->attributes;
        foreach ($this->getHidden() as $field) {
            unset($data[$field]);
        }
        return $data;
    }
}
