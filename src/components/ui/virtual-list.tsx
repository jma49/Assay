import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

// 虚拟列表项的类型定义
export interface VirtualListItem<T = unknown> {
  id: string | number;
  height?: number;
  data: T;
}

// 虚拟列表配置
export interface VirtualListConfig<T = unknown> {
  itemHeight: number;
  overscan?: number;
  estimatedItemSize?: number;
  getItemKey?: (index: number, item: T) => string | number;
}

// 虚拟列表属性
export interface VirtualListProps<T = unknown> {
  items: T[];
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  config: VirtualListConfig<T>;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  height: number;
}

// 默认配置
const DEFAULT_CONFIG: Partial<VirtualListConfig> = {
  overscan: 5,
  estimatedItemSize: 50,
};

/**
 * 虚拟列表组件 - 支持大量数据的高性能渲染
 */
export const VirtualList = <T = unknown>({
  items,
  renderItem,
  config,
  className,
  onScroll,
  loading = false,
  loadingComponent,
  emptyComponent,
  height,
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [, setIsScrolling] = useState(false);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 合并配置
  const finalConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config,
  }), [config]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const containerHeight = height;
    const itemHeight = finalConfig.itemHeight!;
    const overscan = finalConfig.overscan!;

    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight)
    );

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan),
    };
  }, [scrollTop, height, finalConfig.itemHeight, finalConfig.overscan, items.length]);

  // 可见项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange.start, visibleRange.end]);

  // 总高度
  const totalHeight = useMemo(() => {
    return items.length * finalConfig.itemHeight!;
  }, [items.length, finalConfig.itemHeight]);

  // 偏移量
  const offsetY = visibleRange.start * finalConfig.itemHeight!;

  // 滚动处理
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    setIsScrolling(true);

    // 清除之前的超时
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 设置新的超时来检测滚动结束
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // 调用外部滚动回调
    onScroll?.(scrollTop);
  }, [onScroll]);

  // 获取项目键
  const getItemKey = useCallback((index: number, item: T) => {
    if (finalConfig.getItemKey) {
      return finalConfig.getItemKey(index, item);
    }
    return (item as Record<string, unknown>).id || (item as Record<string, unknown>)._id || index;
  }, [finalConfig]);

  // 滚动到指定位置 (暂未使用，保留为未来功能)
  // const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
  //   if (!scrollElementRef.current) return;

  //   const itemHeight = finalConfig.itemHeight!;
  //   let scrollTop = index * itemHeight;

  //   if (align === 'center') {
  //     scrollTop -= height / 2 - itemHeight / 2;
  //   } else if (align === 'end') {
  //     scrollTop -= height - itemHeight;
  //   }

  //   scrollElementRef.current.scrollTop = Math.max(0, scrollTop);
  // }, [finalConfig.itemHeight, height]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 加载状态
  if (loading && loadingComponent) {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        {loadingComponent}
      </div>
    );
  }

  // 空状态
  if (items.length === 0 && emptyComponent) {
    return (
      <div className={cn("w-full flex items-center justify-center", className)} style={{ height }}>
        {emptyComponent}
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'relative',
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index;
            const key = getItemKey(actualIndex, item);
            const style: React.CSSProperties = {
              height: finalConfig.itemHeight,
              width: '100%',
            };

            return (
              <div key={String(key)} style={style}>
                {renderItem(item, actualIndex, style)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 导出滚动到索引的引用类型
export interface VirtualListRef {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

/**
 * 带引用的虚拟列表组件
 */
export const VirtualListWithRef = React.forwardRef<VirtualListRef, VirtualListProps<unknown>>(
  (props, ref) => {
    const scrollElementRef = useRef<HTMLDivElement>(null);

    // 暴露方法
    React.useImperativeHandle(ref, () => ({
      scrollToIndex: (index: number, align: 'start' | 'center' | 'end' = 'start') => {
        if (!scrollElementRef.current) return;

        const itemHeight = props.config.itemHeight;
        let scrollTop = index * itemHeight;

        if (align === 'center') {
          scrollTop -= props.height / 2 - itemHeight / 2;
        } else if (align === 'end') {
          scrollTop -= props.height - itemHeight;
        }

        scrollElementRef.current.scrollTop = Math.max(0, scrollTop);
      },
      scrollToTop: () => {
        if (scrollElementRef.current) {
          scrollElementRef.current.scrollTop = 0;
        }
      },
      scrollToBottom: () => {
        if (scrollElementRef.current) {
          scrollElementRef.current.scrollTop = scrollElementRef.current.scrollHeight;
        }
      },
    }), [props.config.itemHeight, props.height]);

    return <VirtualList {...props} />;
  }
);

VirtualListWithRef.displayName = 'VirtualListWithRef';

/**
 * 虚拟表格组件 - 专门用于表格数据的虚拟化
 */
export interface VirtualTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: Array<{
    key: keyof T;
    title: string;
    width?: number;
    render?: (value: unknown, record: T, index: number) => React.ReactNode;
  }>;
  rowHeight?: number;
  height: number;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((record: T, index: number) => string);
  onRowClick?: (record: T, index: number) => void;
  loading?: boolean;
  empty?: React.ReactNode;
}

export const VirtualTable = <T extends Record<string, unknown> = Record<string, unknown>>({
  data,
  columns,
  rowHeight = 50,
  height,
  className,
  headerClassName,
  rowClassName,
  onRowClick,
  loading,
  empty,
}: VirtualTableProps<T>) => {
  const headerHeight = 40; // 固定表头高度
  const bodyHeight = height - headerHeight;

  const renderRow = useCallback((record: T, index: number, style: React.CSSProperties) => {
    const className = typeof rowClassName === 'function' 
      ? rowClassName(record, index)
      : rowClassName;

    return (
      <div
        className={cn(
          "flex border-b border-gray-200 hover:bg-gray-50 cursor-pointer",
          className
        )}
        style={style}
        onClick={() => onRowClick?.(record, index)}
      >
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className="flex items-center px-4 py-2 text-sm"
            style={{ 
              width: column.width || `${100 / columns.length}%`,
              minWidth: column.width || 100 
            }}
          >
            {column.render 
              ? column.render(record[column.key], record, index)
              : String(record[column.key] ?? '')
            }
          </div>
        ))}
      </div>
    );
  }, [columns, rowClassName, onRowClick]);

  if (loading) {
    return (
      <div className={cn("w-full flex items-center justify-center", className)} style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0 && empty) {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        {/* 表头 */}
        <div 
          className={cn("flex bg-gray-50 border-b border-gray-200", headerClassName)}
          style={{ height: headerHeight }}
        >
          {columns.map((column) => (
            <div
              key={String(column.key)}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-900"
              style={{ 
                width: column.width || `${100 / columns.length}%`,
                minWidth: column.width || 100 
              }}
            >
              {column.title}
            </div>
          ))}
        </div>
        {/* 空状态 */}
        <div className="flex items-center justify-center" style={{ height: bodyHeight }}>
          {empty}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full border border-gray-200 rounded-lg overflow-hidden", className)}>
      {/* 表头 */}
      <div 
        className={cn("flex bg-gray-50 border-b border-gray-200", headerClassName)}
        style={{ height: headerHeight }}
      >
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-900"
            style={{ 
              width: column.width || `${100 / columns.length}%`,
              minWidth: column.width || 100 
            }}
          >
            {column.title}
          </div>
        ))}
      </div>

      {/* 虚拟化表格主体 */}
      <VirtualList
        items={data}
        renderItem={renderRow}
        config={{
          itemHeight: rowHeight,
          overscan: 5,
        }}
        height={bodyHeight}
      />
    </div>
  );
};

/**
 * 无限滚动虚拟列表
 */
export interface InfiniteVirtualListProps<T = unknown> extends Omit<VirtualListProps<T>, 'items'> {
  items: T[];
  hasNextPage: boolean;
  loadNextPage: () => Promise<void>;
  loadingMore?: boolean;
  threshold?: number; // 距离底部多少像素时触发加载
}

export const InfiniteVirtualList = <T = unknown>({
  items,
  hasNextPage,
  loadNextPage,
  loadingMore = false,
  threshold = 200,
  onScroll,
  ...props
}: InfiniteVirtualListProps<T>) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleScroll = useCallback(async (scrollTop: number) => {
    onScroll?.(scrollTop);

    // 计算是否接近底部
    const containerHeight = props.height;
    const totalHeight = items.length * props.config.itemHeight;
    const scrollBottom = totalHeight - (scrollTop + containerHeight);

    // 如果接近底部且有下一页且没有正在加载
    if (scrollBottom <= threshold && hasNextPage && !isLoadingMore && !loadingMore) {
      setIsLoadingMore(true);
      try {
        await loadNextPage();
      } finally {
        setIsLoadingMore(false);
      }
    }
  }, [
    onScroll, 
    props.height, 
    props.config.itemHeight, 
    items.length, 
    threshold, 
    hasNextPage, 
    isLoadingMore, 
    loadingMore, 
    loadNextPage
  ]);

  return (
    <VirtualList
      {...props}
      items={items}
      onScroll={handleScroll}
    />
  );
}; 