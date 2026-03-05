<?php

declare(strict_types=1);

namespace Api\Controllers;

use Api\Context;
use Api\Models\Project;
use Api\Models\ProjectMember;
use Api\Models\ProjectMilestone;
use Api\Models\ProjectTask;

class ProjectMilestoneController extends BaseController
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
        $limit = max(1, min(100, (int)($ctx->query('limit') ?? 20)));
        $offset = ($page - 1) * $limit;

        $rows = ProjectMilestone::query()
            ->where('project_id', $projectId)
            ->orderBy('due_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->limit($limit)
            ->offset($offset)
            ->get();

        $total = ProjectMilestone::query()->where('project_id', $projectId)->count();

        $pdo = Project::getPDO();
        $data = array_map(function (ProjectMilestone $milestone) use ($pdo) {
            $row = $milestone->toArray();
            // Attach tasks
            $stmt = $pdo->prepare(
                "SELECT pt.* FROM project_tasks pt
                 JOIN milestone_tasks mt ON mt.task_id = pt.id
                 WHERE mt.milestone_id = ?
                 ORDER BY pt.position ASC, pt.created_at ASC"
            );
            $stmt->execute([(int)$row['id']]);
            $row['tasks'] = $stmt->fetchAll();
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

        $milestone = new ProjectMilestone([
            'project_id' => $projectId,
            'title' => trim((string)$data['title']),
            'description' => isset($data['description']) ? trim((string)$data['description']) : null,
            'due_date' => isset($data['due_date']) && $data['due_date'] ? $data['due_date'] : null,
            'status' => in_array($data['status'] ?? '', ['open', 'closed'], true) ? $data['status'] : 'open',
        ]);
        $milestone->save();

        return $this->created($ctx, $milestone->toArray());
    }

    public function update(Context $ctx)
    {
        $authResult = $ctx->auth()->authenticate($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $projectId = (int)($ctx->param('id') ?? 0);
        $milestoneId = (int)($ctx->param('mid') ?? 0);

        if (!$this->canAccess($user, $projectId)) {
            return $this->forbidden($ctx, 'Access denied');
        }

        $milestone = ProjectMilestone::query()
            ->where('id', $milestoneId)
            ->where('project_id', $projectId)
            ->first();

        if (!$milestone) {
            return $this->notFound($ctx, 'Milestone not found');
        }

        $data = $this->input();

        if (isset($data['title'])) {
            $milestone->title = trim((string)$data['title']);
        }
        if (array_key_exists('description', $data)) {
            $milestone->description = $data['description'] !== null ? trim((string)$data['description']) : null;
        }
        if (array_key_exists('due_date', $data)) {
            $milestone->due_date = $data['due_date'] ?: null;
        }
        if (isset($data['status']) && in_array($data['status'], ['open', 'closed'], true)) {
            $milestone->status = $data['status'];
        }

        $milestone->save();

        return $this->ok($ctx, $milestone->toArray());
    }

    public function destroy(Context $ctx)
    {
        $authResult = $ctx->auth()->authenticate($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $projectId = (int)($ctx->param('id') ?? 0);
        $milestoneId = (int)($ctx->param('mid') ?? 0);

        if (!$this->canAccess($user, $projectId)) {
            return $this->forbidden($ctx, 'Access denied');
        }

        $milestone = ProjectMilestone::query()
            ->where('id', $milestoneId)
            ->where('project_id', $projectId)
            ->first();

        if (!$milestone) {
            return $this->notFound($ctx, 'Milestone not found');
        }

        $milestone->delete();

        return $this->ok($ctx, ['deleted' => true]);
    }

    public function assignTask(Context $ctx)
    {
        $authResult = $ctx->auth()->authenticate($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $projectId = (int)($ctx->param('id') ?? 0);
        $milestoneId = (int)($ctx->param('mid') ?? 0);
        $taskId = (int)($ctx->param('tid') ?? 0);

        if (!$this->canAccess($user, $projectId)) {
            return $this->forbidden($ctx, 'Access denied');
        }

        $milestone = ProjectMilestone::query()
            ->where('id', $milestoneId)
            ->where('project_id', $projectId)
            ->first();

        if (!$milestone) {
            return $this->notFound($ctx, 'Milestone not found');
        }

        $task = ProjectTask::query()
            ->where('id', $taskId)
            ->where('project_id', $projectId)
            ->first();

        if (!$task) {
            return $this->notFound($ctx, 'Task not found');
        }

        $pdo = Project::getPDO();
        $pdo->prepare(
            'INSERT IGNORE INTO milestone_tasks (milestone_id, task_id) VALUES (?, ?)'
        )->execute([$milestoneId, $taskId]);

        return $this->ok($ctx, ['assigned' => true]);
    }

    public function removeTask(Context $ctx)
    {
        $authResult = $ctx->auth()->authenticate($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $projectId = (int)($ctx->param('id') ?? 0);
        $milestoneId = (int)($ctx->param('mid') ?? 0);
        $taskId = (int)($ctx->param('tid') ?? 0);

        if (!$this->canAccess($user, $projectId)) {
            return $this->forbidden($ctx, 'Access denied');
        }

        $pdo = Project::getPDO();
        $pdo->prepare(
            'DELETE FROM milestone_tasks WHERE milestone_id = ? AND task_id = ?'
        )->execute([$milestoneId, $taskId]);

        return $this->ok($ctx, ['removed' => true]);
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
