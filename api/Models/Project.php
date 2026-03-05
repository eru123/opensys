<?php

declare(strict_types=1);

namespace Api\Models;

class Project extends BaseModel
{
    protected static string $table = 'projects';

    protected function getFillable(): array
    {
        return ['name', 'description', 'status', 'owner_id', 'created_at', 'updated_at'];
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
