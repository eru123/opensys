import { Routes, Route, Navigate } from "react-router-dom";
import { GoeyToaster } from "goey-toast";
import "goey-toast/styles.css";
import { Layout } from "./layouts/dashboard";
import { SettingsLayout } from "./layouts/settings";
import { Dashboard } from "./pages/dashboard";
import { Login } from "./pages/auth/login";
import { Register } from "./pages/auth/register";
import { InviteAcceptance } from "./pages/auth/invite-accept";
import { AdminSetup } from "./pages/auth/admin-setup";
import ForgotPassword from "./pages/auth/forgot-password";
import ResetPassword from "./pages/auth/reset-password";
import { AuthInitializer } from "./lib/auth";
import { lazy, Suspense } from "react";

// Lazy load pages
const Profile = lazy(() => import("./pages/profile"));
const SystemSettingsCompany = lazy(
  () => import("./pages/system-settings-company"),
);
const SystemSettingsControl = lazy(
  () => import("./pages/system-settings-control"),
);
const SystemSettingsConfiguration = lazy(
  () => import("./pages/system-settings-configuration"),
);
const SystemSettingsConfigurationSmtp = lazy(
  () => import("./pages/system-settings-configuration-smtp"),
);
const SystemSettingsConfigurationSms = lazy(
  () => import("./pages/system-settings-configuration-sms"),
);
const SystemSettingsDeveloper = lazy(
  () => import("./pages/system-settings-developer"),
);

const Users = lazy(() => import("./pages/users"));
const Onboarding = lazy(() => import("./pages/onboarding"));
const VerifyEmail = lazy(() => import("./pages/auth/verify-email"));
const NotFound = lazy(() => import("./pages/not-found"));
const UIComponents = lazy(() => import("./pages/ui-components"));
const EmailTemplates = lazy(() => import("./pages/email-templates"));
const EmailTemplateDetail = lazy(() => import("./pages/email-template-detail"));
const EmailSendTemplate = lazy(() => import("./pages/email-send-template"));
const EmailSendRaw = lazy(() => import("./pages/email-send-raw"));
const AuditLogs = lazy(() => import("./pages/audit-logs"));
const AuthenticationLogs = lazy(() => import("./pages/authentication-logs"));
const ErrorLogs = lazy(() => import("./pages/error-logs"));
const CustomersProfiles = lazy(() => import("./pages/customers-profiles"));
const CustomersGroups = lazy(() => import("./pages/customers-groups"));
const CustomersMarketingEmails = lazy(
  () => import("./pages/customers-marketing-emails"),
);
const CustomersEmailTracker = lazy(
  () => import("./pages/customers-email-tracker"),
);
const Projects = lazy(() => import("./pages/projects"));
const ProjectDetail = lazy(() => import("./pages/project-detail"));

function App() {
  return (
    <AuthInitializer>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/invite" element={<InviteAcceptance />} />
        <Route
          path="/auth/admin-setup"
          element={
            <AdminSetup onSetupComplete={() => (window.location.href = "/")} />
          }
        />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route
          path="/auth/verify-email"
          element={
            <Suspense fallback={<div className="p-6">Loading...</div>}>
              <VerifyEmail />
            </Suspense>
          }
        />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route
            path="profile"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <Profile />
              </Suspense>
            }
          />
          <Route
            path="u/:username"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <Profile />
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <Users />
              </Suspense>
            }
          />
          <Route
            path="onboarding"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <Onboarding />
              </Suspense>
            }
          />

          <Route
            path="ui-components"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <UIComponents />
              </Suspense>
            }
          />
          <Route
            path="email-templates"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <EmailTemplates />
              </Suspense>
            }
          />
          <Route
            path="email-templates/new"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <EmailTemplateDetail />
              </Suspense>
            }
          />
          <Route
            path="email-templates/:id"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <EmailTemplateDetail />
              </Suspense>
            }
          />
          <Route
            path="emails/send-template"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <EmailSendTemplate />
              </Suspense>
            }
          />
          <Route
            path="emails/send-raw"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <EmailSendRaw />
              </Suspense>
            }
          />
          <Route
            path="authentication-logs"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <AuthenticationLogs />
              </Suspense>
            }
          />
          <Route
            path="audit-logs"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <AuditLogs />
              </Suspense>
            }
          />
          <Route
            path="error-logs"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <ErrorLogs />
              </Suspense>
            }
          />
          <Route
            path="customers/profiles"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <CustomersProfiles />
              </Suspense>
            }
          />
          <Route
            path="customers/groups"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <CustomersGroups />
              </Suspense>
            }
          />
          <Route
            path="customers/marketing-emails"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <CustomersMarketingEmails />
              </Suspense>
            }
          />
          <Route
            path="customers/email-tracker"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <CustomersEmailTracker />
              </Suspense>
            }
          />
          <Route
            path="projects"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <Projects />
              </Suspense>
            }
          />
          <Route
            path="projects/:id"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <ProjectDetail />
              </Suspense>
            }
          />
        </Route>
        <Route path="/system-settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="company" replace />} />
          <Route
            path="company"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <SystemSettingsCompany />
              </Suspense>
            }
          />
          <Route
            path="control"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <SystemSettingsControl />
              </Suspense>
            }
          />
          <Route
            path="configuration/general"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <SystemSettingsConfiguration />
              </Suspense>
            }
          />
          <Route
            path="configuration/smtp"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <SystemSettingsConfigurationSmtp />
              </Suspense>
            }
          />
          <Route
            path="configuration/sms"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <SystemSettingsConfigurationSms />
              </Suspense>
            }
          />
          <Route
            path="developer"
            element={
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <SystemSettingsDeveloper />
              </Suspense>
            }
          />
        </Route>
        {/* 404 - Catch all unmatched routes */}
        <Route
          path="*"
          element={
            <Suspense fallback={<div className="p-6">Loading...</div>}>
              <NotFound />
            </Suspense>
          }
        />
      </Routes>
      <GoeyToaster position="top-right" />
    </AuthInitializer>
  );
}

export default App;
