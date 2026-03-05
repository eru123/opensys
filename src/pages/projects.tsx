import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { goeyToast as toast } from "goey-toast";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Modal,
  DataTable,
  DropdownMenuItem,
  confirmModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Textarea,
} from "@/components/ui";
import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { useAuth } from "@/lib/auth";
import { Plus, FolderOpen } from "lucide-react";
import type { Project, ProjectStatus } from "@/types";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  archived: "Archived",
};

const STATUS_VARIANTS: Record<ProjectStatus, "default" | "secondary"> = {
  active: "default",
  archived: "secondary",
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "active" as ProjectStatus,
  });

  const {
    data,
    loading,
    pagination,
    handlePageChange,
    handleLimitChange,
    handleSearch,
    handleFilter,
    params,
    refresh,
  } = usePaginatedApi<Project>("/api/projects", { initialLimit: 10 });

  const tableFilters = useMemo(
    () => [
      {
        label: "Status",
        value: "status",
        type: "select" as const,
        options: [
          { label: "Active", value: "active" },
          { label: "Archived", value: "archived" },
        ],
        searchOnChanged: true,
      },
    ],
    [],
  );

  const filterValues = useMemo(() => {
    const values: Record<string, any> = {};
    if (params.filters?.status) {
      values.status = new Set([params.filters.status]);
    }
    return values;
  }, [params.filters]);

  const handleFilterChange = (key: string, value: any) => {
    const nextFilters: any = { ...params.filters };
    if (key === "status") {
      const selected = value as Set<string>;
      delete nextFilters.status;
      if (selected.size > 0) {
        nextFilters.status = [...selected][0];
      }
    }
    handleFilter(nextFilters);
  };

  const handleBatchFilterChange = (updates: Record<string, any>) => {
    const nextFilters: any = { ...params.filters };
    Object.entries(updates).forEach(([key, value]) => {
      if (key === "status") {
        const selected = value as Set<string>;
        delete nextFilters.status;
        if (selected.size > 0) nextFilters.status = [...selected][0];
      } else {
        nextFilters[key] = value;
      }
    });
    handleFilter(nextFilters);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", description: "", status: "active" });
    setModalOpen(true);
  };

  const openEdit = (row: Project) => {
    setEditId(row.id);
    setForm({
      name: row.name,
      description: row.description || "",
      status: row.status,
    });
    setModalOpen(true);
  };

  const saveProject = async () => {
    if (!form.name.trim()) {
      toast.error("Project name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await axios.put(`/api/projects/${editId}`, form);
        toast.success("Project updated");
      } else {
        await axios.post("/api/projects", form);
        toast.success("Project created");
      }
      setModalOpen(false);
      refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async (row: Project) => {
    const confirmed = await confirmModal({
      title: "Delete project",
      message: `Delete "${row.name}" and all its tasks, milestones and members?`,
      type: "danger",
      confirmText: "Delete",
    });
    if (!confirmed) return;
    try {
      await axios.delete(`/api/projects/${row.id}`);
      toast.success("Project deleted");
      refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete project");
    }
  };

  const columns = useMemo(
    () => [
      {
        header: "Name",
        cell: (row: Project) => (
          <Link
            to={`/projects/${row.id}`}
            className="font-medium text-primary hover:underline flex items-center gap-2"
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            {row.name}
          </Link>
        ),
      },
      {
        header: "Description",
        cell: (row: Project) => (
          <span className="text-sm text-muted-foreground line-clamp-1">
            {row.description || "—"}
          </span>
        ),
      },
      {
        header: "Status",
        cell: (row: Project) => (
          <Badge variant={STATUS_VARIANTS[row.status]}>
            {STATUS_LABELS[row.status]}
          </Badge>
        ),
      },
      {
        header: "Owner",
        cell: (row: Project) => row.owner_name || "—",
      },
      {
        header: "Members",
        cell: (row: Project) => row.member_count ?? 0,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Projects
          </h2>
          <p className="text-sm text-gray-500">
            Manage projects, tasks, milestones, and team members.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable
            data={data}
            columns={columns}
            isLoading={loading}
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={handlePageChange}
            onPageSizeChange={handleLimitChange}
            searchKey="search"
            searchValue={params.search}
            onSearchChange={handleSearch}
            filters={tableFilters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onBatchFilterChange={handleBatchFilterChange}
            onReset={() => handleFilter({})}
            actions={
              isAdmin
                ? (row: Project) => (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={`/projects/${row.id}`}>Open</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(row)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => removeProject(row)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </>
                  )
                : (row: Project) => (
                    <DropdownMenuItem asChild>
                      <Link to={`/projects/${row.id}`}>Open</Link>
                    </DropdownMenuItem>
                  )
            }
          />
        </CardContent>
      </Card>

      <Modal show={modalOpen} onClose={() => !saving && setModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {editId ? "Edit Project" : "New Project"}
            </h3>
            <p className="text-sm text-gray-600">
              {editId
                ? "Update project details."
                : "Create a new project to organise tasks and milestones."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="proj_name">Project Name</Label>
              <Input
                id="proj_name"
                placeholder="e.g. Website Redesign"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj_desc">Description (optional)</Label>
              <Textarea
                id="proj_desc"
                placeholder="What is this project about?"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            {editId && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as ProjectStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={saveProject} disabled={saving}>
              {saving ? "Saving..." : editId ? "Update" : "Create Project"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
