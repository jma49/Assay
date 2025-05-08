'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface FindingDetail {
  // 定义 findings 内部的具体结构，例如：
  // external_order_id: string;
  // count: number;
  // 您需要根据 check-order-duplicates.sql 脚本的实际输出调整此接口
  [key: string]: any; // 作为一个通用回退
}

interface ExecutionResult {
  scriptId: string;
  executedAt: string;
  status: string;
  message: string;
  findings: FindingDetail[] | string; // findings 可以是对象数组或字符串
  _id: string;
}

export default function ViewExecutionResultPage() {
  const params = useParams();
  const resultId = params.resultId as string;
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resultId) {
      fetch(`/api/execution-details/${resultId}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `Error: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setResult(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("获取结果详情失败:", err);
          setError(err.message);
          setLoading(false);
        });
    }
  }, [resultId]);

  if (loading) {
    return <div className="container mx-auto p-4">加载中...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4">错误: {error}</div>;
  }

  if (!result) {
    return <div className="container mx-auto p-4">未找到结果。</div>;
  }

  // 格式化 findings
  let findingsContent;
  if (typeof result.findings === 'string') {
    findingsContent = <p>{result.findings}</p>;
  } else if (Array.isArray(result.findings) && result.findings.length > 0) {
    const headers = Object.keys(result.findings[0]);
    findingsContent = (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {header.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {result.findings.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((header) => (
                <td key={`${rowIndex}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {typeof row[header] === 'object' ? JSON.stringify(row[header]) : row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else {
    findingsContent = <p>无发现。</p>;
  }

  return (
    <div className="container mx-auto p-8 bg-gray-50 min-h-screen">
      <div className="bg-white shadow-lg rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">执行结果详情</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm font-medium text-gray-500">脚本 ID</p>
            <p className="text-lg text-gray-900">{result.scriptId}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">执行时间</p>
            <p className="text-lg text-gray-900">{new Date(result.executedAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">状态</p>
            <p className={`text-lg font-semibold ${result.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{result.status}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">消息</p>
            <p className="text-lg text-gray-900">{result.message}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">结果 ID</p>
            <p className="text-lg text-gray-900">{result._id}</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">查询发现</h2>
          <div className="overflow-x-auto bg-white border border-gray-200 rounded-md p-4">
            {findingsContent}
          </div>
        </div>
      </div>
    </div>
  );
} 