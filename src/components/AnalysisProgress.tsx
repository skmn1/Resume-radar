import React from 'react';

interface AnalysisProgressProps {
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
}

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ 
  progress, 
  currentStep, 
  estimatedTimeRemaining 
}) => {
  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Analyzing Resume
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {currentStep}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress
          </span>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {Math.round(progress)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{ width: `${Math.max(5, progress)}%` }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 -skew-x-12 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between items-center mb-4">
        {['Parse', 'Detect', 'Analyze', 'AI Process', 'Complete'].map((step, index) => {
          const stepProgress = (index / 4) * 100;
          const isCompleted = progress > stepProgress;
          const isCurrent = progress >= stepProgress && progress < ((index + 1) / 4) * 100;
          
          return (
            <div key={step} className="flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent 
                    ? 'bg-blue-500 text-white animate-pulse' 
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className={`text-xs mt-1 transition-colors duration-300 ${
                isCompleted || isCurrent 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-400'
              }`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Estimated Time */}
      {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Estimated time remaining: {Math.ceil(estimatedTimeRemaining / 1000)}s
          </p>
        </div>
      )}

      {/* Loading Animation */}
      <div className="flex justify-center mt-4">
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.6s'
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalysisProgress;
