import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { UserRole } from '@/types';

// Analysis progress states
export interface AnalysisProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  steps: {
    name: string;
    completed: boolean;
    duration?: number;
  }[];
  startTime: number;
  estimatedCompletionTime?: number;
}

// In-memory store for progress tracking (in production, use Redis)
const progressStore = new Map<string, AnalysisProgress>();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authentication
    const authResult = await requireAuth(request, UserRole.USER);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { user } = authResult;
    const { id } = await params;

    // Verify the analysis belongs to the user
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!analysis) {
      return NextResponse.json(
        { success: false, message: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Get progress from store
    const progress = progressStore.get(id);
    
    if (!progress) {
      // If no progress found, check if analysis is completed
      return NextResponse.json({
        success: true,
        progress: {
          id,
          status: 'completed',
          progress: 100,
          currentStep: 'Analysis complete',
          steps: [],
          startTime: Date.now()
        }
      });
    }

    return NextResponse.json({
      success: true,
      progress
    });

  } catch (error) {
    console.error('Progress check error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get analysis progress' },
      { status: 500 }
    );
  }
}

// Helper functions for updating progress
export class ProgressTracker {
  private analysisId: string;
  private progress: AnalysisProgress;

  constructor(analysisId: string) {
    this.analysisId = analysisId;
    this.progress = {
      id: analysisId,
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing analysis...',
      steps: [
        { name: 'File parsing', completed: false },
        { name: 'Language detection', completed: false },
        { name: 'Content analysis', completed: false },
        { name: 'AI processing', completed: false },
        { name: 'Results compilation', completed: false }
      ],
      startTime: Date.now()
    };
    
    progressStore.set(analysisId, this.progress);
  }

  updateProgress(step: string, progress: number, currentStepIndex?: number) {
    this.progress.currentStep = step;
    this.progress.progress = Math.min(100, Math.max(0, progress));
    this.progress.status = progress >= 100 ? 'completed' : 'processing';
    
    if (currentStepIndex !== undefined && currentStepIndex < this.progress.steps.length) {
      this.progress.steps[currentStepIndex].completed = true;
    }

    // Estimate completion time based on current progress
    if (progress > 0) {
      const elapsed = Date.now() - this.progress.startTime;
      const estimated = (elapsed / progress) * 100;
      this.progress.estimatedCompletionTime = this.progress.startTime + estimated;
    }

    progressStore.set(this.analysisId, this.progress);
  }

  getStartTime(): number {
    return this.progress.startTime;
  }

  setCompleted() {
    this.progress.status = 'completed';
    this.progress.progress = 100;
    this.progress.currentStep = 'Analysis complete';
    this.progress.steps.forEach(step => step.completed = true);
    progressStore.set(this.analysisId, this.progress);

    // Clean up after 5 minutes
    setTimeout(() => {
      progressStore.delete(this.analysisId);
    }, 5 * 60 * 1000);
  }

  setFailed(error: string) {
    this.progress.status = 'failed';
    this.progress.currentStep = `Failed: ${error}`;
    progressStore.set(this.analysisId, this.progress);

    // Clean up after 1 minute
    setTimeout(() => {
      progressStore.delete(this.analysisId);
    }, 60 * 1000);
  }

  static getTracker(analysisId: string): ProgressTracker | null {
    const progress = progressStore.get(analysisId);
    if (!progress) return null;
    
    const tracker = Object.create(ProgressTracker.prototype);
    tracker.analysisId = analysisId;
    tracker.progress = progress;
    return tracker;
  }
}
