<?php

declare(strict_types=1);

namespace Api\Controllers;

use Api\Context;
use Api\Models\Project;
use Api\Models\ProjectMember;
use Api\Models\User;

class ProjectController extends BaseController
{
    /**
     * List projects. Admins see all; other authenticated users see projects
     * they own or are a member of.
     */
    public function index(Context $ctx)
    {
        $authResult = $ctx->auth()->authenticate($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $page = max(1, (int)($ctx->query('page') ?? 1));
        $limit = max(1, min(100, (int)($ctx->query('limit') ?? 20)));
        $offset = ($page - 1) * $limit;
        $search = trim((string)($ctx->query('search') ?? ''));
        $statusFilter = $ctx->query('status');

        $isAdmin = ($user['role'] ?? '') === 'admin';

        $pdo = Project::getPDO();

        // Build base WHERE
        $where = [];
        $params = [];

        if (!$isAdmin) {
            $where[] = '(p.owner_id = ? OR pm.user_id = ?)';
            $params[] = (int)$user['id'];
            $params[] = (int)$user['id'];
        }

        if ($search !== '') {
            $where[] = '(p.name LIKE ? OR p.description LIKE ?)';
            $term = '%' . $search . '%';
            $params[] = $term;
            $params[] = $term;
        }

        if ($statusFilter !== null && $statusFilter !== '') {
            $where[] = 'p.status = ?';
            $params[] = $statusFilter;
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $joinClause = $isAdmin ? '' : 'LEFT JOIN project_members pm ON pm.project_id = p.id';

        $sql = "SELECT DISTINCT p.*, u.first_name, u.last_name
                FROM projects p
                LEFT JOIN users u ON u.id = p.owner_id
                {$joinClause}
                {$whereClause}
                ORDER BY p.updated_at DESC
                LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Count
        $countParams = array_slice($params, 0, -2);
        $countSql = "SELECT COUNT(DISTINCT p.id) FROM projects p {$joinClause} {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($countParams);
        $total = (int)$countStmt->fetchColumn();

        // Attach member counts
        $projectIds = array_column($rows, 'id');
        $memberCounts = [];
        if ($projectIds) {
            $placeholders = implode(',', array_fill(0, count($projectIds), '?'));
            $mcStmt = $pdo->prepare("SELECT project_id, COUNT(*) as cnt FROM project_members WHERE project_id IN ({$placeholders}) GROUP BY project_id");
            $mcStmt->execute($projectIds);
            foreach ($mcStmt->fetchAll() as $mc) {
                $memberCounts[(int)$mc['project_id']] = (int)$mc['cnt'];
            }
        }

        $data = array_map(function ($row) use ($memberCounts) {
            $row['member_count'] = $memberCounts[(int)$row['id']] ?? 0;
            $row['owner_name'] = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
            unset($row['first_name'], $row['last_name']);
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

    /**
     * Get a single project with members and task summary.
     */
    public function show(Context $ctx)
    {
        $authResult = $ctx->auth()->authenticate($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $id = (int)($ctx->param('id') ?? 0);
        $project = Project::find($id);

        if (!$project) {
            return $this->notFound($ctx, 'Project not found');
        }

        if (!$this->canAccess($user, (int)$project->id)) {
            return $this->forbidden($ctx, 'Access denied');
        }

        $pdo = Project::getPDO();

        // Members with user info
        $membersStmt = $pdo->prepare(
            "SELECT pm.*, u.first_name, u.last_name, u.email, u.username
             FROM project_members pm
             JOIN users u ON u.id = pm.user_id
             WHERE pm.project_id = ?
             ORDER BY pm.created_at ASC"
        );
        $membersStmt->execute([$id]);
        $members = $membersStmt->fetchAll();

        // Owner info
        $owner = User::find((int)$project->owner_id);
        $ownerData = $owner ? [
            'id' => $owner->id,
            'first_name' => $owner->first_name,
            'last_name' => $owner->last_name,
            'email' => $owner->email,
            'username' => $owner->username,
        ] : null;

        // Task status counts
        $taskStmt = $pdo->prepare(
            "SELECT status, COUNT(*) as cnt FROM project_tasks WHERE project_id = ? GROUP BY status"
        );
        $taskStmt->execute([$id]);
        $taskCounts = [];
        foreach ($taskStmt->fetchAll() as $tc) {
            $taskCounts[$tc['status']] = (int)$tc['cnt'];
        }

        $result = $project->toArray();
        $result['owner'] = $ownerData;
        $result['members'] = $members;
        $result['task_counts'] = $taskCounts;

        return $this->ok($ctx, $result);
    }

    /**
     * Create a new project. Admin only.
     */
    public function store(Context $ctx)
    {
        $authResult = $ctx->auth()->requireAdmin($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $data = $this->input();

        $errors = $this->validate($data, [
            'name' => 'required',
        ]);
        if ($errors) {
            return $this->badRequest($ctx, 'Validation failed', $errors);
        }

        $project = new Project([
            'name' => trim((string)$data['name']),
            'description' => isset($data['description']) ? trim((string)$data['description']) : null,
            'status' => in_array($data['status'] ?? '', ['active', 'archived'], true) ? $data['status'] : 'active',
            'owner_id' => (int)$user['id'],
        ]);
        $project->save();

        return $this->created($ctx, $project->toArray());
    }

    /**
     * Update a project. Admin only.
     */
    public function update(Context $ctx)
    {
        $authResult = $ctx->auth()->requireAdmin($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $id = (int)($ctx->param('id') ?? 0);
        $project = Project::find($id);
        if (!$project) {
            return $this->notFound($ctx, 'Project not found');
        }

        $data = $this->input();

        if (isset($data['name'])) {
            $project->name = trim((string)$data['name']);
        }
        if (array_key_exists('description', $data)) {
            $project->description = $data['description'] !== null ? trim((string)$data['description']) : null;
        }
        if (isset($data['status']) && in_array($data['status'], ['active', 'archived'], true)) {
            $project->status = $data['status'];
        }

        $project->save();

        return $this->ok($ctx, $project->toArray());
    }

    /**
     * Delete a project. Admin only.
     */
    public function destroy(Context $ctx)
    {
        $authResult = $ctx->auth()->requireAdmin($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $id = (int)($ctx->param('id') ?? 0);
        $project = Project::find($id);
        if (!$project) {
            return $this->notFound($ctx, 'Project not found');
        }

        $project->delete();

        return $this->ok($ctx, ['deleted' => true]);
    }

    // --- Member management ---

    public function listMembers(Context $ctx)
    {
        $authResult = $ctx->auth()->authenticate($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $user = $ctx->user();
        $id = (int)($ctx->param('id') ?? 0);
        $project = Project::find($id);
        if (!$project) {
            return $this->notFound($ctx, 'Project not found');
        }

        if (!$this->canAccess($user, $id)) {
            return $this->forbidden($ctx, 'Access denied');
        }

        $pdo = Project::getPDO();
        $stmt = $pdo->prepare(
            "SELECT pm.*, u.first_name, u.last_name, u.email, u.username, u.avatar_url
             FROM project_members pm
             JOIN users u ON u.id = pm.user_id
             WHERE pm.project_id = ?
             ORDER BY pm.created_at ASC"
        );
        $stmt->execute([$id]);
        $members = $stmt->fetchAll();

        return $this->ok($ctx, ['data' => $members]);
    }

    public function addMember(Context $ctx)
    {
        $authResult = $ctx->auth()->requireAdmin($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $id = (int)($ctx->param('id') ?? 0);
        $project = Project::find($id);
        if (!$project) {
            return $this->notFound($ctx, 'Project not found');
        }

        $data = $this->input();
        $errors = $this->validate($data, ['user_id' => 'required']);
        if ($errors) {
            return $this->badRequest($ctx, 'Validation failed', $errors);
        }

        $userId = (int)$data['user_id'];
        $role = in_array($data['role'] ?? '', ['admin', 'member', 'viewer'], true) ? $data['role'] : 'member';

        $existing = ProjectMember::query()
            ->where('project_id', $id)
            ->where('user_id', $userId)
            ->first();

        if ($existing) {
            return $this->badRequest($ctx, 'User is already a member');
        }

        $member = new ProjectMember([
            'project_id' => $id,
            'user_id' => $userId,
            'role' => $role,
        ]);
        $member->save();

        return $this->created($ctx, $member->toArray());
    }

    public function updateMember(Context $ctx)
    {
        $authResult = $ctx->auth()->requireAdmin($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $id = (int)($ctx->param('id') ?? 0);
        $userId = (int)($ctx->param('uid') ?? 0);

        $member = ProjectMember::query()
            ->where('project_id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$member) {
            return $this->notFound($ctx, 'Member not found');
        }

        $data = $this->input();
        if (isset($data['role']) && in_array($data['role'], ['admin', 'member', 'viewer'], true)) {
            $member->role = $data['role'];
            $member->save();
        }

        return $this->ok($ctx, $member->toArray());
    }

    public function removeMember(Context $ctx)
    {
        $authResult = $ctx->auth()->requireAdmin($ctx);
        if ($authResult !== true) {
            return $authResult;
        }

        $id = (int)($ctx->param('id') ?? 0);
        $userId = (int)($ctx->param('uid') ?? 0);

        $member = ProjectMember::query()
            ->where('project_id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$member) {
            return $this->notFound($ctx, 'Member not found');
        }

        $member->delete();

        return $this->ok($ctx, ['deleted' => true]);
    }

    // --- Helpers ---

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
