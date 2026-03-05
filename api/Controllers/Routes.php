<?php

declare(strict_types = 1)
;

namespace Api\Controllers;

use Api\Router;
use Api\Context;

class Routes
{

    public static function handler(Router $api): void
    {
        // define middleware
        $auth = fn(Context $ctx) => $ctx->auth()->authenticate($ctx);
        $admin = fn(Context $ctx) => $ctx->auth()->requireAdmin($ctx);

        // Authentication routes (Mixed public/auth/admin)
        $api->group('/auth', function (Router $router) use ($auth, $admin) {
            // Public routes
            $router->get('/admin-count', [AuthController::class , 'adminCount']);
            $router->post('/setup-admin', [AuthController::class , 'setupAdmin']);
            $router->post('/register', [AuthController::class , 'register']);
            $router->post('/verify-signup', [AuthController::class , 'verifySignup']);
            $router->post('/login', [AuthController::class , 'login']);
            $router->post('/refresh', [AuthController::class , 'refreshToken']);
            $router->get('/invitation', [AuthController::class , 'getInvitation']);
            $router->post('/accept-invitation', [AuthController::class , 'acceptInvitation']);
            $router->get('/verify-email', [AuthController::class , 'verifyEmail']);
            $router->post('/forgot-password', [AuthController::class , 'forgotPassword']);
            $router->post('/reset-password', [AuthController::class , 'resetPassword']);

            // Auth required
            $router->group('', function (Router $r) use ($auth) {
                    $r->use($auth);
                    $r->post('/logout', [AuthController::class , 'logout']);
                    $r->get('/me', [AuthController::class , 'me']);
                }
                );

                // Admin required
                $router->group('', function (Router $r) use ($admin) {
                    $r->use($admin);
                    $r->post('/invite', [AuthController::class , 'invite']);
                }
                );

                $router->any('/(.*)?', [self::class , 'fallback']);
            });

        // System settings
        $api->group('/system-settings', function (Router $settings) use ($admin) {
            $settings->get('/public', [SystemSettingController::class , 'publicSettings']);

            // Protected settings (Admin only)
            $settings->group('', function (Router $r) use ($admin) {
                    $r->use($admin);
                    $r->get('/security', [SystemSettingController::class , 'getSecuritySettings']);
                    $r->put('/security', [SystemSettingController::class , 'updateSecuritySettings']);
                    $r->put('/company', [SystemSettingController::class , 'updateCompanySettings']);
                    $r->get('/smtp', [SystemSettingController::class , 'getSmtpSettings']);
                    $r->put('/smtp', [SystemSettingController::class , 'updateSmtpSettings']);
                }
                );

                $settings->any('/(.*)?', [self::class , 'fallback']);
            });

        // Email templates (admin)
        $api->group('/email-templates', function (Router $templates) use ($admin) {
            $templates->use($admin);
            $templates->get('', [EmailTemplateController::class , 'index']);
            $templates->post('', [EmailTemplateController::class , 'store']);
            $templates->get('/{id}', [EmailTemplateController::class , 'show']);
            $templates->put('/{id}', [EmailTemplateController::class , 'update']);
            $templates->delete('/{id}', [EmailTemplateController::class , 'destroy']);
            $templates->post('/{id}/preview', [EmailTemplateController::class , 'preview']);
            $templates->any('/(.*)?', [self::class , 'fallback']);
        });

        // Email sending (admin)
        $api->group('/emails', function (Router $emails) use ($admin) {
            $emails->use($admin);
            $emails->post('/send-template', [EmailSendController::class , 'sendTemplate']);
            $emails->post('/send-raw', [EmailSendController::class , 'sendRaw']);
            $emails->any('/(.*)?', [self::class , 'fallback']);
        });


        // Customers (admin)
        $api->group('/customers', function (Router $customers) use ($admin) {
            $customers->use($admin);
            $customers->get('/profiles', [CustomerProfileController::class , 'index']);
            $customers->post('/profiles', [CustomerProfileController::class , 'store']);
            $customers->put('/profiles/{id}', [CustomerProfileController::class , 'update']);
            $customers->delete('/profiles/{id}', [CustomerProfileController::class , 'destroy']);

            $customers->get('/groups', [CustomerGroupController::class , 'index']);
            $customers->post('/groups', [CustomerGroupController::class , 'store']);
            $customers->get('/groups/{id}', [CustomerGroupController::class , 'show']);
            $customers->put('/groups/{id}', [CustomerGroupController::class , 'update']);
            $customers->delete('/groups/{id}', [CustomerGroupController::class , 'destroy']);

            $customers->get('/marketing-templates', [MarketingEmailTemplateController::class , 'index']);
            $customers->post('/marketing-templates', [MarketingEmailTemplateController::class , 'store']);
            $customers->put('/marketing-templates/{id}', [MarketingEmailTemplateController::class , 'update']);
            $customers->delete('/marketing-templates/{id}', [MarketingEmailTemplateController::class , 'destroy']);

            $customers->post('/marketing-emails/queue', [MarketingEmailRequestController::class , 'queue']);
            $customers->get('/marketing-emails/requests', [MarketingEmailRequestController::class , 'index']);
            $customers->any('/(.*)?', [self::class , 'fallback']);
        });

        // Uploads (auth required)
        $api->group('/uploads', function (Router $uploads) use ($auth) {
            $uploads->use($auth);
            $uploads->get('', [UploadController::class , 'index']);
            $uploads->post('', [UploadController::class , 'store']);
            $uploads->get('/{id}', [UploadController::class , 'show']);
            $uploads->put('/{id}', [UploadController::class , 'update']);
            $uploads->delete('/{id}', [UploadController::class , 'destroy']);
            $uploads->any('/(.*)?', [self::class , 'fallback']);
        });

        // Profile routes (auth required)
        $api->group('/profile', function (Router $profile) use ($auth) {
            $profile->use($auth);
            $profile->get('', [ProfileController::class , 'show']);
            $profile->put('', [ProfileController::class , 'update']);
            $profile->put('/password', [ProfileController::class , 'updatePassword']);
            $profile->any('/(.*)?', [self::class , 'fallback']);
        });

        // Public user profile (auth required to see details, but publicly accessible via username)
        $api->get('/u/{username}', [ProfileController::class , 'publicShow']);

        // User management routes (admin)
        $api->group('/users', function (Router $users) use ($admin) {
            $users->use($admin);
            $users->get('', [UserController::class , 'index']);
            $users->put('/{id}', [UserController::class , 'update']);
            $users->post('/{id}/approve', [UserController::class , 'approve']);
            $users->post('/{id}/reject', [UserController::class , 'reject']);
            $users->any('/(.*)?', [self::class , 'fallback']);
        });

        // Audit logs (admin only)
        $api->group('/audit-logs', function (Router $logs) use ($admin) {
            $logs->use($admin);
            $logs->get('', [AuditController::class , 'index']);
            $logs->get('/{id}', [AuditController::class , 'show']);
            $logs->any('/(.*)?', [self::class , 'fallback']);
        });

        // Authentication logs (auth required - controller handles overrides for own/admin)
        $api->group('/authentication-logs', function (Router $logs) use ($auth) {
            $logs->use($auth);
            $logs->get('', [AuthenticationLogController::class , 'index']);
            $logs->any('/(.*)?', [self::class , 'fallback']);
        });

        // Error logs (admin only)
        $api->group('/error-logs', function (Router $logs) use ($admin) {
            $logs->use($admin);
            $logs->get('', [ErrorLogController::class , 'index']);
            $logs->get('/{id}', [ErrorLogController::class , 'show']);
            $logs->delete('/{id}', [ErrorLogController::class , 'destroy']);
            $logs->any('/(.*)?', [self::class , 'fallback']);
        });

        // Projects (auth required; admin for create/update/delete)
        $api->group('/projects', function (Router $projects) use ($auth) {
            $projects->use($auth);
            $projects->get('', [ProjectController::class, 'index']);
            $projects->post('', [ProjectController::class, 'store']);
            $projects->get('/{id}', [ProjectController::class, 'show']);
            $projects->put('/{id}', [ProjectController::class, 'update']);
            $projects->delete('/{id}', [ProjectController::class, 'destroy']);

            // Members
            $projects->get('/{id}/members', [ProjectController::class, 'listMembers']);
            $projects->post('/{id}/members', [ProjectController::class, 'addMember']);
            $projects->put('/{id}/members/{uid}', [ProjectController::class, 'updateMember']);
            $projects->delete('/{id}/members/{uid}', [ProjectController::class, 'removeMember']);

            // Tasks
            $projects->get('/{id}/tasks', [ProjectTaskController::class, 'index']);
            $projects->post('/{id}/tasks', [ProjectTaskController::class, 'store']);
            $projects->put('/{id}/tasks/{tid}', [ProjectTaskController::class, 'update']);
            $projects->delete('/{id}/tasks/{tid}', [ProjectTaskController::class, 'destroy']);

            // Milestones
            $projects->get('/{id}/milestones', [ProjectMilestoneController::class, 'index']);
            $projects->post('/{id}/milestones', [ProjectMilestoneController::class, 'store']);
            $projects->put('/{id}/milestones/{mid}', [ProjectMilestoneController::class, 'update']);
            $projects->delete('/{id}/milestones/{mid}', [ProjectMilestoneController::class, 'destroy']);
            $projects->post('/{id}/milestones/{mid}/tasks/{tid}', [ProjectMilestoneController::class, 'assignTask']);
            $projects->delete('/{id}/milestones/{mid}/tasks/{tid}', [ProjectMilestoneController::class, 'removeTask']);

            $projects->any('/(.*)?', [self::class, 'fallback']);
        });

        // Fall back route for api routes
        $api->any('/(.*)?', [static::class , 'fallback']);
    }

    public static function fallback(Context $ctx)
    {
        $ctx->http(404);
        return [
            'error' => true,
            'message' => 'API endpoint not found',
            'code' => 404
        ];
    }
}
