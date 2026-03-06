import { Link, useLocation } from "react-router-dom";
import { cn } from "@/components/ui";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CreditCard,
  User,
  Settings,
  Users,
  UserCheck,
  LayoutGrid,
  Mail,
  Send,
  FileText,
  Shield,
  ChevronDown,
  ChevronRight,
  X,
  AlertTriangle,
  ScrollText,
  FolderKanban,
} from "lucide-react";
import { brandingConfig } from "@/utils/branding";
import { useAuth } from "@/lib/auth";
import { useSystemSettings } from "@/hooks/useSystemSettings";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

interface NavGroup {
  name: string;
  icon: any;
  items: NavItem[];
}

type NavigationItem = NavItem | NavGroup;

function isNavGroup(item: NavigationItem): item is NavGroup {
  return "items" in item;
}

export function Sidebar({ isOpen, onClose }: SidebarProps): JSX.Element {
  const { user } = useAuth();
  const { data: systemSettings } = useSystemSettings();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const showUIComponents =
    user?.role === "admin" && !!systemSettings?.show_ui_components;
  const companyName =
    (systemSettings?.company_name ?? "").trim() || brandingConfig.appShortName;
  const logoUrl = (systemSettings?.company_logo_url ?? "").trim();
  const authLogsItem: NavItem = {
    name: "Authentication Logs",
    href: "/authentication-logs",
    icon: Shield,
  };
  const logsGroup: NavGroup = {
    name: "Logs",
    icon: ScrollText,
    items: [
      authLogsItem,
      { name: "Audit Logs", href: "/audit-logs", icon: FileText },
      { name: "Error Logs", href: "/error-logs", icon: AlertTriangle },
    ],
  };
  const projectsGroup: NavGroup = {
    name: "Projects",
    icon: FolderKanban,
    items: [
      { name: "All Projects", href: "/projects", icon: FolderKanban },
    ],
  };

  const navigation: NavigationItem[] = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Profile", href: "/profile", icon: User },
    projectsGroup,
    ...(user?.role === "admin"
      ? [
        logsGroup,
        {
          name: "User Management",
          icon: Users,
          items: [
            { name: "Users", href: "/users", icon: User },
            { name: "Onboarding", href: "/onboarding", icon: UserCheck },
          ],
        },
        {
          name: "Email",
          icon: Mail,
          items: [
            { name: "Templates", href: "/email-templates", icon: FileText },
            {
              name: "Send Templated",
              href: "/emails/send-template",
              icon: Mail,
            },
            { name: "Send Raw", href: "/emails/send-raw", icon: Send },
          ],
        },
        {
          name: "Customers",
          icon: Users,
          items: [
            { name: "Customer Profiles", href: "/customers/profiles", icon: User },
            { name: "Customer Groups", href: "/customers/groups", icon: Users },
            { name: "Marketing Email", href: "/customers/marketing-emails", icon: Mail },
            { name: "Email Tracker", href: "/customers/email-tracker", icon: FileText },
          ],
        },
        { name: "Settings", href: "/system-settings/company", icon: Settings },
        ...(showUIComponents
          ? [
            {
              name: "UI Components",
              href: "/ui-components",
              icon: LayoutGrid,
            },
          ]
          : []),
      ]
      : [authLogsItem]),
  ];

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.innerWidth < 1024) {
        // lg breakpoint
        onClose();
      }
    };
    handleRouteChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const isActivePath = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return (
      location.pathname === href || location.pathname.startsWith(`${href}/`)
    );
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => isActivePath(item.href));
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const navItemClasses = (active: boolean) =>
    cn(
      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
    );

  const groupHeaderClasses = (active: boolean) =>
    cn(
      "group flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
      active
        ? "bg-primary/5 text-primary"
        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
    );

  const iconClasses = (active: boolean) =>
    cn(
      "h-5 w-5 transition-colors",
      active
        ? "text-primary"
        : "text-muted-foreground group-hover:text-foreground",
    );

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    const Icon = item.icon;
    const active = isActivePath(item.href);
    return (
      <li key={item.href}>
        <Link
          to={item.href}
          className={cn(navItemClasses(active), isSubItem && "pl-11 text-xs")}
        >
          <Icon className={iconClasses(active)} />
          <span>{item.name}</span>
        </Link>
      </li>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const Icon = group.icon;
    const isExpanded = expandedGroups[group.name] ?? isGroupActive(group);
    const hasActiveItem = isGroupActive(group);
    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

    return (
      <li key={group.name}>
        <div
          onClick={() => toggleGroup(group.name)}
          className={groupHeaderClasses(hasActiveItem)}
        >
          <div className="flex items-center gap-3">
            <Icon className={iconClasses(hasActiveItem)} />
            <span>{group.name}</span>
          </div>
          <ChevronIcon className="h-4 w-4" />
        </div>
        {isExpanded && (
          <ul className="mt-1 space-y-1">
            {group.items.map((item) => renderNavItem(item, true))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-64 flex flex-col border-r border-border bg-card shadow-lg z-50 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="sticky top-0 flex h-16 items-center justify-between gap-2 px-6 bg-card border-b border-border z-10">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="h-6 w-auto max-w-[120px] object-contain"
              />
            ) : (
              <CreditCard className="h-6 w-6 text-primary" />
            )}
            <span className="text-lg font-semibold text-foreground">
              {companyName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-muted/40 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              if (isNavGroup(item)) {
                return renderNavGroup(item);
              }
              return renderNavItem(item);
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
