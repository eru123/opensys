export type Role = 'admin' | 'support' | 'client'

export interface User {
  id: number | string
  username: string
  firstName?: string
  lastName?: string
  display_name?: string | null
  email: string
  avatar_url?: string | null
  role: Role
  is_active?: boolean
  isActive?: boolean
  is_approved?: boolean
  is_rejected?: boolean
  approved_at?: string | null
  approved_by?: number | null
  email_verified_at?: string | null
  mfa_enabled?: boolean
  mfa_method?: 'email' | 'authenticator' | null
  timezone?: string
  currency?: string
  preferences?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface InvitationSummary {
  email: string
  role: Role
  expires_at: string
}

// Project Management
export type ProjectStatus = 'active' | 'archived'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type MemberRole = 'admin' | 'member' | 'viewer'
export type MilestoneStatus = 'open' | 'closed'

export interface Project {
  id: number
  name: string
  description?: string | null
  status: ProjectStatus
  owner_id: number
  owner_name?: string
  member_count?: number
  task_counts?: Record<TaskStatus, number>
  created_at?: string
  updated_at?: string
}

export interface ProjectMember {
  id: number
  project_id: number
  user_id: number
  role: MemberRole
  first_name?: string
  last_name?: string
  email?: string
  username?: string
  avatar_url?: string | null
  created_at?: string
}

export interface ProjectTask {
  id: number
  project_id: number
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id?: number | null
  assignee?: { id: number; first_name: string; last_name: string; username: string; avatar_url?: string | null } | null
  due_date?: string | null
  position: number
  created_by: number
  created_at?: string
  updated_at?: string
}

export interface ProjectMilestone {
  id: number
  project_id: number
  title: string
  description?: string | null
  due_date?: string | null
  status: MilestoneStatus
  tasks?: ProjectTask[]
  created_at?: string
  updated_at?: string
}
