'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>出现了一些错误！</h2>
      <p>{error.message || '抱歉，处理您的请求时发生错误。'}</p>
      <button onClick={() => reset()}>再试一次</button>
    </div>
  );
} 