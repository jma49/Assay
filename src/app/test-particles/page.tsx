'use client';

import ParticleBackground from '@/components/effects/ParticleBackground';

export default function TestParticlesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <ParticleBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-6 p-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-2xl">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            粒子背景测试页面
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            如果粒子背景正常工作，你应该能看到：
          </p>
          <ul className="text-left space-y-2 text-gray-700 dark:text-gray-300">
            <li>• 蓝色的粒子点在背景中移动</li>
            <li>• 粒子之间有连接线</li>
            <li>• 鼠标靠近时粒子会被推开</li>
            <li>• 粒子会在边界处循环出现</li>
          </ul>
          <div className="mt-8">
            <button 
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 