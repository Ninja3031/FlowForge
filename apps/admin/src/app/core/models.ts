export type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'PROJECT_MANAGER' | 'MEMBER';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  organizationId: number | null;
}

export interface Session {
  accessToken: string;
  user: User;
}

export interface AdminUser extends User {
  isActive: boolean;
  organizationName: string | null;
  createdAt: string;
}

export interface PlatformStats {
  organizations: number;
  users: number;
  projects: number;
  tasks: number;
  tasksByStatus: Record<string, number>;
  usersByRole: Record<string, number>;
  activityLast7Days: number;
  aiHealthReports: number;
}

export interface SystemHealth {
  status: 'ok' | 'degraded' | 'down';
  services: { mysql: boolean; mongo: boolean; redis: boolean };
}

export interface AdminOrganization {
  id: number;
  name: string;
  createdAt: string;
  memberCount: number;
  projectCount: number;
}

export interface AdminProject {
  id: number;
  name: string;
  key: string;
  organizationName: string;
  createdAt: string;
  taskCount: number;
  doneCount: number;
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super admin',
  ORG_ADMIN: 'Org admin',
  PROJECT_MANAGER: 'Project manager',
  MEMBER: 'Member',
};