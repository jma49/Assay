'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div>
      <h2>页面未找到 (404)</h2>
      <p>抱歉，无法找到您请求的资源。</p>
      <Link href="/">返回首页</Link>
    </div>
  );
} 