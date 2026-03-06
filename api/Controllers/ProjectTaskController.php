<?php

declare(strict_types=1);

namespace Api\Controllers;

use Api\Context;
use Api\Models\Project;
use Api\Models\ProjectMember;
use Api\Models\ProjectTask;

class ProjectTaskController extends BaseController
{
    public function index(Context $ctx)
    {
        $authResult = $ctx->auth()->authenticate($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $projectId = (int)($ctx->param('id') ?? 0);

        $project = Project::find($projectId);
        if (!$project) {
            return $this->notFound($ctx, 'Project not found');
        }

        if (!$this->canAccess($user, $projectId)) {
            return $this->forbidden($ctx, 'Access denied');
        }

        $page = max(1, (int)($ctx->query('page') ?? 1));
        $limit = max(1, min(100, (int)($ctx->query('limit') ?? 50)));
        $offset = ($page - 1) * $limit;
        $search = trim((string)($ctx->query('search') ?? ''));
        $statusFilter = $ctx->query('status');
        $priorityFilter = $ctx->query('priority');
        $assigneeFilter = $ctx->query('assignee_id');

        $query = ProjectTask::query()
            ->select(['project_tasks.*'])
            ->where('project_tasks.project_id', $projectId);

        if ($search !== '') {
            $term = '%' . $search . '%';
            $query->whereRaw('(project_tasks.title LIKE ? OR project_tasks.description LIKE ?)', [$term, $term]);
        }
        if ($statusFilter !== null && $statusFilter !== '') {
            $query->where('project_tasks.status', $statusFilter);
        }
        if ($priorityFilter !== null && $priorityFilter !== '') {
            $query->where('project_tasks.priority', $priorityFilter);
        }
        if ($assigneeFilter !== null && $assigneeFilter !== '') {
            $query->where('project_tasks.assignee_id', (int)$assigneeFilter);
        }

        $rows = $query->orderBy('project_tasks.position', 'asc')
            ->orderBy('project_tasks.created_at', 'desc')
            ->limit($limit)
            ->offset($offset)
            ->get();

        $countQuery = ProjectTask::query()->where('project_id', $projectId);
        if ($search !== '') {
            $term = '%' . $search . '%';
            $countQuery->whereRaw('(title LIKE ? OR description LIKE ?)', [$term, $term]);
        }
        if ($statusFilter !== null && $statusFilter !== '') {
            $countQuery->where('status', $statusFilter);
        }
        if ($priorityFilter !== null && $priorityFilter !== '') {
            $countQuery->where('priority', $priorityFilter);
        }
        if ($assigneeFilter !== null && $assigneeFilter !== '') {
            $countQuery->where('assignee_id', (int)$assigneeFilter);
        }
        $total = $countQuery->count();

        // Enrich with assignee info
        $pdo = Project::getPDO();
        $data = array_map(function (ProjectTask $task) use ($pdo) {
            $row = $task->toArray();
            if ($row['assignee_id']) {
                $stmt = $pdo->prepare('SELECT id, first_name, last_name, username, avatar_url FROM users WHERE id = ?');
                $stmt->execute([(int)$row['assignee_id']]);
                $row['assignee'] = $stmt->fetch() ?: null;
            } else {
                $row['assignee'] = null;
            }
            return $row;
        }, $rows);

        return $this->ok($ctx, [
            'data' => $data,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
            ],
        ]);
    }

    public function store(Context $ctx)
    {
        $authResult = $ctx->auth()->authenticate($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $projectId = (int)($ctx->param('id') ?? 0);

        $project = Project::find($projectId);
        if (!$project) {
            return $this->notFound($ctx, 'Project not found');
        }

        if (!$this->canAccess($user, $projectId)) {
            return $this->forbidden($ctx, 'Access denied');
        }

        $data = $this->input();
        $errors = $this->validate($data, ['title' => 'required']);
        if ($errors) {
            return $this->badRequest($ctx, 'Validation failed', $errors);
        }

        $allowedStatuses = ['todo', 'in_progress', 'review', 'done'];
        $allowedPriorities = ['low', 'medium', 'high', 'urgent'];

        $task = new ProjectTask([
            'project_id' => $projectId,
            'title' => trim((string)$data['title']),
            'description' => isset($data['description']) ? trim((string)$data['description']) : null,
            'status' => in_array($data['status'] ?? '', $allowedStatuses, true) ? $data['status'] : 'todo',
            'priority' => in_array($data['priority'] ?? '', $allowedPriorities, true) ? $data['priority'] : 'medium',
            'assignee_id' => isset($data['assignee_id']) && $data['assignee_id'] ? (int)$data['assignee_id'] : null,
            'due_date' => isset($data['due_date']) && $data['due_date'] ? $data['due_date'] : null,
            'position' => (int)($data['position'] ?? 0),
            'created_by' => (int)$user['id'],
        ]);
        $task->save();

        return $this->created($ctx, $task->toArray());
    }

    public function update(Context $ctx)
    {
        $authResult = $ctx->auth()->authenticate($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $projectId = (int)($ctx->param('id') ?? 0);
        $taskId = (int)($ctx->param('tid') ?? 0);

        $project = Project::find($projectId);
        if (!$project) {
            return $this->notFound($ctx, 'Project not found');
        }

        if (!$this->canAccess($user, $projectId)) {
            return $this->forbidden($ctx, 'Access denied');
        }

        $task = ProjectTask::query()
            ->where('id', $taskId)
            ->where('project_id', $projectId)
            ->first();

        if (!$task) {
            return $this->notFound($ctx, 'Task not found');
        }

        $data = $this->input();
        $allowedStatuses = ['todo', 'in_progress', 'review', 'done'];
        $allowedPriorities = ['low', 'medium', 'high', 'urgent'];

        if (isset($data['title'])) {
            $task->title = trim((string)$data['title']);
        }
        if (array_key_exists('description', $data)) {
            $task->description = $data['description'] !== null ? trim((string)$data['description']) : null;
        }
        if (isset($data['status']) && in_array($data['status'], $allowedStatuses, true)) {
            $task->status = $data['status'];
        }
        if (isset($data['priority']) && in_array($data['priority'], $allowedPriorities, true)) {
            $task->priority = $data['priority'];
        }
        if (array_key_exists('assignee_id', $data)) {
            $task->assignee_id = $data['assignee_id'] ? (int)$data['assignee_id'] : null;
        }
        if (array_key_exists('due_date', $data)) {
            $task->due_date = $data['due_date'] ?: null;
        }
        if (isset($data['position'])) {
            $task->position = (int)$data['position'];
        }

        $task->save();

        return $this->ok($ctx, $task->toArray());
    }

    public function destroy(Context $ctx)
    {
        $authResult = $ctx->auth()->authenticate($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $projectId = (int)($ctx->param('id') ?? 0);
        $taskId = (int)($ctx->param('tid') ?? 0);

        if (!$this->canAccess($user, $projectId)) {
            return $this->forbidden($ctx, 'Access denied');
        }

        $task = ProjectTask::query()
            ->where('id', $taskId)
            ->where('project_id', $projectId)
            ->first();

        if (!$task) {
            return $this->notFound($ctx, 'Task not found');
        }

        $task->delete();

        return $this->ok($ctx, ['deleted' => true]);
    }

    private function canAccess(array $user, int $projectId): bool
    {
        if (($user['role'] ?? '') === 'admin') {
            return true;
        }

        $project = Project::find($projectId);
        if (!$project) {
            return false;
        }

        if ((int)$project->owner_id === (int)$user['id']) {
            return true;
        }

        $member = ProjectMember::query()
            ->where('project_id', $projectId)
            ->where('user_id', (int)$user['id'])
            ->first();

        return $member !== null;
    }
}
