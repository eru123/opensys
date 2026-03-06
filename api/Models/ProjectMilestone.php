<?php

declare(strict_types=1);

namespace Api\Models;

class ProjectMilestone extends BaseModel
{
    protected static string $table = 'project_milestones';

    protected function getFillable(): array
    {
        return ['project_id', 'title', 'description', 'due_date', 'status', 'created_at', 'updated_at'];
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
