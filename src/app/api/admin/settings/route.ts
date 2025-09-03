import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, createAuditLog } from '@/lib/rbac';
import { UserRole } from '@/types';
import { z } from 'zod';

const systemSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  description: z.string().optional(),
  category: z.string().default('general'),
  isPublic: z.boolean().default(false)
});

export async function GET(request: NextRequest) {
  try {
    // Require SUPER_ADMIN for system settings
    const authResult = await requireAuth(request, UserRole.SUPER_ADMIN);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where = category ? { category } : {};

    const settings = await prisma.systemSettings.findMany({
      where,
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        category: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });

    // Parse JSON values
    const parsedSettings = settings.map(setting => ({
      ...setting,
      value: JSON.parse(setting.value)
    }));

    // Create audit log
    await createAuditLog(user, 'ADMIN_SETTINGS_VIEWED', undefined, { category }, request);

    return NextResponse.json({
      success: true,
      settings: parsedSettings
    });

  } catch (error) {
    console.error('Get system settings error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require SUPER_ADMIN for system settings
    const authResult = await requireAuth(request, UserRole.SUPER_ADMIN);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { user } = authResult;
    const body = await request.json();
    const { key, value, description, category, isPublic } = systemSettingSchema.parse(body);

    // Check if setting already exists
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key }
    });

    if (existingSetting) {
      return NextResponse.json(
        { success: false, message: 'Setting with this key already exists' },
        { status: 400 }
      );
    }

    // Create setting
    const setting = await prisma.systemSettings.create({
      data: {
        key,
        value: JSON.stringify(value),
        description,
        category,
        isPublic,
        createdById: user.id
      },
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        category: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Create audit log
    await createAuditLog(
      user, 
      'ADMIN_SETTING_CREATED', 
      `setting:${setting.id}`, 
      { key, category }, 
      request
    );

    return NextResponse.json({
      success: true,
      setting: {
        ...setting,
        value: JSON.parse(setting.value)
      }
    });

  } catch (error) {
    console.error('Create system setting error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to create system setting' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Require SUPER_ADMIN for system settings
    const authResult = await requireAuth(request, UserRole.SUPER_ADMIN);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const settingId = searchParams.get('id');

    if (!settingId) {
      return NextResponse.json(
        { success: false, message: 'Setting ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData = systemSettingSchema.partial().parse(body);

    if (updateData.value !== undefined) {
      updateData.value = JSON.stringify(updateData.value);
    }

    const setting = await prisma.systemSettings.update({
      where: { id: settingId },
      data: updateData as any,
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        category: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Create audit log
    await createAuditLog(
      user, 
      'ADMIN_SETTING_UPDATED', 
      `setting:${settingId}`, 
      { changes: body }, 
      request
    );

    return NextResponse.json({
      success: true,
      setting: {
        ...setting,
        value: JSON.parse(setting.value)
      }
    });

  } catch (error) {
    console.error('Update system setting error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to update system setting' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require SUPER_ADMIN for system settings
    const authResult = await requireAuth(request, UserRole.SUPER_ADMIN);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const settingId = searchParams.get('id');

    if (!settingId) {
      return NextResponse.json(
        { success: false, message: 'Setting ID required' },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSettings.findUnique({
      where: { id: settingId },
      select: { key: true, category: true }
    });

    if (!setting) {
      return NextResponse.json(
        { success: false, message: 'Setting not found' },
        { status: 404 }
      );
    }

    await prisma.systemSettings.delete({
      where: { id: settingId }
    });

    // Create audit log
    await createAuditLog(
      user, 
      'ADMIN_SETTING_DELETED', 
      `setting:${settingId}`, 
      { key: setting.key, category: setting.category }, 
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Setting deleted successfully'
    });

  } catch (error) {
    console.error('Delete system setting error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete system setting' },
      { status: 500 }
    );
  }
}
