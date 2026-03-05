import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { goeyToast as toast } from "goey-toast";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Modal,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
  confirmModal,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";
import {
  Plus,
  Users,
  CheckSquare,
  Milestone,
  LayoutKanban,
  MoreVertical,
  ArrowLeft,
  Pencil,
  Trash2,
  UserPlus,
  Calendar,
} from "lucide-react";
import type {
  Project,
  ProjectMember,
  ProjectTask,
  ProjectMilestone,
  TaskStatus,
  TaskPriority,
  MemberRole,
  MilestoneStatus,
} from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "In Review",
  done: "Done",
};

const TASK_STATUS_VARIANTS: Record<
  TaskStatus,
  "default" | "secondary" | "destructive"
> = {
  todo: "secondary",
  in_progress: "default",
  review: "default",
  done: "secondary",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const KANBAN_COLUMNS: TaskStatus[] = ["todo", "in_progress", "review", "done"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAssigneeName(task: ProjectTask) {
  if (!task.assignee) return "Unassigned";
  const { first_name, last_name } = task.assignee;
  return [first_name, last_name].filter(Boolean).join(" ");
}

// ─── Task Form Modal ──────────────────────────────────────────────────────────

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  task?: ProjectTask | null;
  members: ProjectMember[];
  onSaved: () => void;
}

function TaskFormModal({
  open,
  onClose,
  projectId,
  task,
  members,
  onSaved,
}: TaskFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    status: (task?.status || "todo") as TaskStatus,
    priority: (task?.priority || "medium") as TaskPriority,
    assignee_id: task?.assignee_id ? String(task.assignee_id) : "",
    due_date: task?.due_date || "",
  });

  useEffect(() => {
    setForm({
      title: task?.title || "",
      description: task?.description || "",
      status: (task?.status || "todo") as TaskStatus,
      priority: (task?.priority || "medium") as TaskPriority,
      assignee_id: task?.assignee_id ? String(task.assignee_id) : "",
      due_date: task?.due_date || "",
    });
  }, [task, open]);

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
        due_date: form.due_date || null,
      };
      if (task) {
        await axios.put(`/api/projects/${projectId}/tasks/${task.id}`, payload);
        toast.success("Task updated");
      } else {
        await axios.post(`/api/projects/${projectId}/tasks`, payload);
        toast.success("Task created");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={open} onClose={() => !saving && onClose()}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {task ? "Edit Task" : "New Task"}
        </h3>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Task title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              rows={3}
              placeholder="Task description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as TaskStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {TASK_STATUS_LABELS[s]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm({ ...form, priority: v as TaskPriority })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map(
                    (p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={form.assignee_id || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, assignee_id: v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={String(m.user_id)}>
                      {[m.first_name, m.last_name].filter(Boolean).join(" ") ||
                        m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : task ? "Update Task" : "Create Task"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Milestone Form Modal ─────────────────────────────────────────────────────

interface MilestoneFormProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  milestone?: ProjectMilestone | null;
  onSaved: () => void;
}

function MilestoneFormModal({
  open,
  onClose,
  projectId,
  milestone,
  onSaved,
}: MilestoneFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: milestone?.title || "",
    description: milestone?.description || "",
    due_date: milestone?.due_date || "",
    status: (milestone?.status || "open") as MilestoneStatus,
  });

  useEffect(() => {
    setForm({
      title: milestone?.title || "",
      description: milestone?.description || "",
      due_date: milestone?.due_date || "",
      status: (milestone?.status || "open") as MilestoneStatus,
    });
  }, [milestone, open]);

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Milestone title is required");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, due_date: form.due_date || null };
      if (milestone) {
        await axios.put(
          `/api/projects/${projectId}/milestones/${milestone.id}`,
          payload,
        );
        toast.success("Milestone updated");
      } else {
        await axios.post(`/api/projects/${projectId}/milestones`, payload);
        toast.success("Milestone created");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save milestone");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={open} onClose={() => !saving && onClose()}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {milestone ? "Edit Milestone" : "New Milestone"}
        </h3>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Milestone title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              rows={2}
              placeholder="Milestone description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as MilestoneStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving
              ? "Saving..."
              : milestone
                ? "Update Milestone"
                : "Create Milestone"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  onSaved: () => void;
}

function AddMemberModal({
  open,
  onClose,
  projectId,
  onSaved,
}: AddMemberModalProps) {
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<MemberRole>("member");

  useEffect(() => {
    if (open) {
      setUserId("");
      setRole("member");
    }
  }, [open]);

  const save = async () => {
    if (!userId.trim()) {
      toast.error("User ID is required");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`/api/projects/${projectId}/members`, {
        user_id: parseInt(userId),
        role,
      });
      toast.success("Member added");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={open} onClose={() => !saving && onClose()}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Add Member</h3>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>User ID</Label>
            <Input
              type="number"
              placeholder="Enter user ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find user IDs in the Users management section.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as MemberRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Adding..." : "Add Member"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Assign Task to Milestone Modal ──────────────────────────────────────────

interface AssignTaskModalProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  milestoneId: number;
  tasks: ProjectTask[];
  assignedTaskIds: number[];
  onSaved: () => void;
}

function AssignTaskModal({
  open,
  onClose,
  projectId,
  milestoneId,
  tasks,
  assignedTaskIds,
  onSaved,
}: AssignTaskModalProps) {
  const [saving, setSaving] = useState(false);
  const [taskId, setTaskId] = useState("");

  const unassigned = tasks.filter((t) => !assignedTaskIds.includes(t.id));

  useEffect(() => {
    if (open) setTaskId("");
  }, [open]);

  const save = async () => {
    if (!taskId) {
      toast.error("Select a task");
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `/api/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}`,
        {},
      );
      toast.success("Task assigned to milestone");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={open} onClose={() => !saving && onClose()}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Assign Task to Milestone</h3>

        <div className="space-y-2">
          <Label>Task</Label>
          <Select value={taskId} onValueChange={setTaskId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a task" />
            </SelectTrigger>
            <SelectContent>
              {unassigned.length === 0 ? (
                <SelectItem value="none" disabled>
                  All tasks are assigned
                </SelectItem>
              ) : (
                unassigned.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || unassigned.length === 0}>
            {saving ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [project, setProject] = useState<
    (Project & { members: ProjectMember[]; owner: any }) | null
  >(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [taskModal, setTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [milestoneModal, setMilestoneModal] = useState(false);
  const [editMilestone, setEditMilestone] = useState<ProjectMilestone | null>(
    null,
  );
  const [memberModal, setMemberModal] = useState(false);
  const [assignTaskModal, setAssignTaskModal] = useState<{
    open: boolean;
    milestoneId: number;
    assignedIds: number[];
  }>({ open: false, milestoneId: 0, assignedIds: [] });

  const loadProject = useCallback(async () => {
    try {
      const res = await axios.get(`/api/projects/${projectId}`);
      setProject(res.data);
      setMembers(res.data.members || []);
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadTasks = useCallback(async () => {
    try {
      const res = await axios.get(`/api/projects/${projectId}/tasks?limit=200`);
      setTasks(res.data.data || []);
    } catch {
      // ignore
    }
  }, [projectId]);

  const loadMilestones = useCallback(async () => {
    try {
      const res = await axios.get(
        `/api/projects/${projectId}/milestones?limit=100`,
      );
      setMilestones(res.data.data || []);
    } catch {
      // ignore
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    loadTasks();
    loadMilestones();
  }, [loadProject, loadTasks, loadMilestones]);

  const deleteTask = async (task: ProjectTask) => {
    const confirmed = await confirmModal({
      title: "Delete task",
      message: `Delete "${task.title}"?`,
      type: "danger",
      confirmText: "Delete",
    });
    if (!confirmed) return;
    try {
      await axios.delete(`/api/projects/${projectId}/tasks/${task.id}`);
      toast.success("Task deleted");
      loadTasks();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const moveTask = async (task: ProjectTask, newStatus: TaskStatus) => {
    try {
      await axios.put(`/api/projects/${projectId}/tasks/${task.id}`, {
        status: newStatus,
      });
      loadTasks();
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const deleteMilestone = async (m: ProjectMilestone) => {
    const confirmed = await confirmModal({
      title: "Delete milestone",
      message: `Delete "${m.title}"?`,
      type: "danger",
      confirmText: "Delete",
    });
    if (!confirmed) return;
    try {
      await axios.delete(`/api/projects/${projectId}/milestones/${m.id}`);
      toast.success("Milestone deleted");
      loadMilestones();
    } catch {
      toast.error("Failed to delete milestone");
    }
  };

  const removeTaskFromMilestone = async (
    milestoneId: number,
    taskId: number,
  ) => {
    try {
      await axios.delete(
        `/api/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}`,
      );
      toast.success("Task removed from milestone");
      loadMilestones();
    } catch {
      toast.error("Failed to remove task");
    }
  };

  const removeMember = async (m: ProjectMember) => {
    const confirmed = await confirmModal({
      title: "Remove member",
      message: `Remove ${[m.first_name, m.last_name].filter(Boolean).join(" ") || m.email} from this project?`,
      type: "danger",
      confirmText: "Remove",
    });
    if (!confirmed) return;
    try {
      await axios.delete(
        `/api/projects/${projectId}/members/${m.user_id}`,
      );
      toast.success("Member removed");
      loadProject();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading project…</div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">Project not found.</p>
        <Link to="/projects">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const tasksByStatus = KANBAN_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, ProjectTask[]>,
  );

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/projects"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="h-3 w-3" /> Projects
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {project.name}
          </h2>
          {project.description && (
            <p className="text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Badge variant={project.status === "active" ? "default" : "secondary"}>
              {project.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {doneTasks}/{totalTasks} tasks done
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="tasks" className="flex items-center gap-1">
            <CheckSquare className="h-4 w-4" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="board" className="flex items-center gap-1">
            <LayoutKanban className="h-4 w-4" /> Board
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex items-center gap-1">
            <Milestone className="h-4 w-4" /> Milestones
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-1">
            <Users className="h-4 w-4" /> Members
          </TabsTrigger>
        </TabsList>

        {/* ── Tasks Tab ── */}
        <TabsContent value="tasks" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditTask(null);
                setTaskModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No tasks yet. Create one to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{task.title}</span>
                        <Badge variant={TASK_STATUS_VARIANTS[task.status]}>
                          {TASK_STATUS_LABELS[task.status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{getAssigneeName(task)}</span>
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {task.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm" className="h-7 w-7 p-0 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditTask(task);
                            setTaskModal(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteTask(task)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Board Tab ── */}
        <TabsContent value="board" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button
              size="sm"
              onClick={() => {
                setEditTask(null);
                setTaskModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {KANBAN_COLUMNS.map((status) => (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {TASK_STATUS_LABELS[status]}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {tasksByStatus[status].length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[120px] rounded-lg bg-muted/30 p-2">
                  {tasksByStatus[status].map((task) => (
                    <Card
                      key={task.id}
                      className="cursor-default hover:shadow-sm transition-shadow"
                    >
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-sm font-medium leading-tight">
                            {task.title}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {KANBAN_COLUMNS.filter((s) => s !== status).map(
                                (s) => (
                                  <DropdownMenuItem
                                    key={s}
                                    onClick={() => moveTask(task, s)}
                                  >
                                    Move to {TASK_STATUS_LABELS[s]}
                                  </DropdownMenuItem>
                                ),
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditTask(task);
                                  setTaskModal(true);
                                }}
                              >
                                <Pencil className="h-3 w-3 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteTask(task)}
                              >
                                <Trash2 className="h-3 w-3 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Calendar className="h-3 w-3" />
                              {task.due_date}
                            </span>
                          )}
                        </div>
                        {task.assignee && (
                          <p className="text-xs text-muted-foreground">
                            {getAssigneeName(task)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Milestones Tab ── */}
        <TabsContent value="milestones" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">
              {milestones.length} milestone
              {milestones.length !== 1 ? "s" : ""}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditMilestone(null);
                setMilestoneModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Milestone
            </Button>
          </div>

          {milestones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No milestones yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {milestones.map((m) => {
                const mTasks = m.tasks || [];
                const mDone = mTasks.filter((t) => t.status === "done").length;
                const pct =
                  mTasks.length > 0
                    ? Math.round((mDone / mTasks.length) * 100)
                    : 0;

                return (
                  <Card key={m.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-base">{m.title}</CardTitle>
                          {m.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {m.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <Badge
                              variant={
                                m.status === "closed" ? "secondary" : "default"
                              }
                            >
                              {m.status}
                            </Badge>
                            {m.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {m.due_date}
                              </span>
                            )}
                            <span>
                              {mDone}/{mTasks.length} tasks · {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setAssignTaskModal({
                                open: true,
                                milestoneId: m.id,
                                assignedIds: mTasks.map((t) => t.id),
                              })
                            }
                          >
                            <Plus className="h-3 w-3 mr-1" /> Task
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditMilestone(m);
                                  setMilestoneModal(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteMilestone(m)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    {mTasks.length > 0 && (
                      <CardContent className="pt-0">
                        <div className="space-y-1 mt-2">
                          {mTasks.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-2 text-sm py-1 px-2 rounded hover:bg-muted/40"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge
                                  variant={TASK_STATUS_VARIANTS[t.status]}
                                  className="text-xs shrink-0"
                                >
                                  {TASK_STATUS_LABELS[t.status]}
                                </Badge>
                                <span className="truncate">{t.title}</span>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  removeTaskFromMilestone(m.id, t.id)
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Members Tab ── */}
        <TabsContent value="members" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
            {isAdmin && (
              <Button size="sm" onClick={() => setMemberModal(true)}>
                <UserPlus className="h-4 w-4 mr-1" /> Add Member
              </Button>
            )}
          </div>

          {members.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No members yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {[m.first_name, m.last_name].filter(Boolean).join(" ") ||
                          m.username ||
                          m.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{m.role}</Badge>
                      {isAdmin && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMember(m)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Modals ── */}
      <TaskFormModal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        projectId={projectId}
        task={editTask}
        members={members}
        onSaved={loadTasks}
      />

      <MilestoneFormModal
        open={milestoneModal}
        onClose={() => setMilestoneModal(false)}
        projectId={projectId}
        milestone={editMilestone}
        onSaved={loadMilestones}
      />

      {isAdmin && (
        <AddMemberModal
          open={memberModal}
          onClose={() => setMemberModal(false)}
          projectId={projectId}
          onSaved={loadProject}
        />
      )}

      <AssignTaskModal
        open={assignTaskModal.open}
        onClose={() =>
          setAssignTaskModal({ open: false, milestoneId: 0, assignedIds: [] })
        }
        projectId={projectId}
        milestoneId={assignTaskModal.milestoneId}
        tasks={tasks}
        assignedTaskIds={assignTaskModal.assignedIds}
        onSaved={loadMilestones}
      />
    </div>
  );
}
