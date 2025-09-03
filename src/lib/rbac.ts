import { NextRequest } from 'next/server';
import { verifyToken } from './auth';
import { prisma } from './prisma';
import { UserRole } from '@/types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

/**
 * Verify JWT token and get user information
 */
export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload || typeof payload === 'string') {
      return null;
    }

    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lockedUntil: true
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      isActive: user.isActive
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthenticatedUser, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.USER]: 0,
    [UserRole.HR_ADMIN]: 1,
    [UserRole.SUPER_ADMIN]: 2
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can access resource
 */
export function canAccessResource(user: AuthenticatedUser, resourceUserId?: string): boolean {
  // Super admins can access everything
  if (user.role === UserRole.SUPER_ADMIN) {
    return true;
  }

  // HR admins can access user resources
  if (user.role === UserRole.HR_ADMIN && resourceUserId) {
    return true;
  }

  // Users can only access their own resources
  return !resourceUserId || user.id === resourceUserId;
}

/**
 * Middleware function to check authentication and role
 */
export async function requireAuth(
  request: NextRequest,
  requiredRole: UserRole = UserRole.USER
): Promise<{ user: AuthenticatedUser } | { error: Response }> {
  const user = await authenticateUser(request);
  
  if (!user) {
    return {
      error: new Response(
        JSON.stringify({ success: false, message: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  if (!hasRole(user, requiredRole)) {
    return {
      error: new Response(
        JSON.stringify({ success: false, message: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  return { user };
}

/**
 * Create audit log entry
 */
export async function createAuditLog(
  user: AuthenticatedUser | null,
  action: string,
  resource?: string,
  details?: any,
  request?: NextRequest
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: user?.id,
        action,
        resource,
        details: details ? JSON.stringify(details) : null,
        ipAddress: request ? getClientIP(request) : null,
        userAgent: request ? request.headers.get('user-agent') : null
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return 'unknown';
}

/**
 * Rate limiting helper
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  limit: number = 10,
  windowMinutes: number = 15
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

  try {
    // Clean up old rate limit records
    await prisma.rateLimits.deleteMany({
      where: {
        windowStart: { lt: windowStart }
      }
    });

    // Get current count for this identifier and action
    const currentLimit = await prisma.rateLimits.findFirst({
      where: {
        identifier,
        action,
        windowStart: { gte: windowStart }
      }
    });

    if (!currentLimit) {
      // Create new rate limit record
      await prisma.rateLimits.create({
        data: {
          identifier,
          action,
          count: 1,
          windowStart: new Date()
        }
      });
      
      const resetTime = new Date();
      resetTime.setMinutes(resetTime.getMinutes() + windowMinutes);
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime
      };
    }

    const resetTime = new Date(currentLimit.windowStart);
    resetTime.setMinutes(resetTime.getMinutes() + windowMinutes);

    if (currentLimit.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime
      };
    }

    // Increment count
    await prisma.rateLimits.update({
      where: { id: currentLimit.id },
      data: { count: currentLimit.count + 1 }
    });

    return {
      allowed: true,
      remaining: limit - currentLimit.count - 1,
      resetTime
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Allow request if rate limiting fails
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: new Date(Date.now() + windowMinutes * 60 * 1000)
    };
  }
}
