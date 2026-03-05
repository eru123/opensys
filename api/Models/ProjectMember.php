<?php

declare(strict_types=1);

namespace Api\Models;

class ProjectMember extends BaseModel
{
    protected static string $table = 'project_members';

    protected function getFillable(): array
    {
        return ['project_id', 'user_id', 'role', 'created_at', 'updated_at'];
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
