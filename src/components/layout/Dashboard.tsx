"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/components/common/LanguageProvider";

// Import shadcn UI components


// Import subcomponents and types from dashboard folder
import {
  Check,
  dashboardTranslations,
  CHECK_HISTORY_ITEMS_PER_PAGE,
  ScriptInfo,
  type DashboardTranslationKeys,
} from "@/components/business/dashboard/types";
import { StatsCards } from "@/components/business/dashboard/StatsCards";
import { ManualTrigger } from "@/components/business/dashboard/ManualTrigger";
import { CheckHistory } from "@/components/business/dashboard/CheckHistory";
import { LoadingError } from "@/components/business/dashboard/LoadingError";
import {
  SkeletonCard,
  SkeletonTable,
} from "@/components/business/dashboard/SkeletonComponents";
import { DashboardFooter } from "@/components/business/dashboard/DashboardFooter";

// --- Main Component ---
const Dashboard = () => {
  // --- State Hooks ---
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextScheduled, setNextScheduled] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Check | "";
    direction: "ascending" | "descending";
  }>({ key: "execution_time", direction: "descending" });
  const [availableScripts, setAvailableScripts] = useState<ScriptInfo[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [isFetchingScripts, setIsFetchingScripts] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [triggerMessageType, setTriggerMessageType] = useState<
    "success" | "error" | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);

  // 新增：后端分页相关状态
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [isLoadingChecks, setIsLoadingChecks] = useState(false);

  // 新增：分离统计数据状态
  const [overallStats, setOverallStats] = useState<{
    totalCount: number;
    successCount: number;
    failureCount: number;
    needsAttentionCount: number;
  }>({
    totalCount: 0,
    successCount: 0,
    failureCount: 0,
    needsAttentionCount: 0,
  });

  // API调用去重：使用ref来避免重复调用
  const isLoadingRef = useRef(false);

  // --- Context Hooks ---
  const { language } = useLanguage();

  // 新增：搜索模式状态
  const [isSearchMode, setIsSearchMode] = useState(false);

  // 稳定的setSelectedScriptId包装函数，避免无限循环
  const stableSetSelectedScriptId = useCallback((scriptId: string) => {
    setSelectedScriptId(scriptId);
  }, []);

  // --- Translation Helper ---
  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations =
        dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language],
  );

  // 新增：获取分页检查数据的函数
  const loadPaginatedChecks = useCallback(async (
    page: number = 1,
    status?: string | null,
    search?: string,
    hashtags?: string[],
    sortBy?: string,
    sortOrder?: string
  ) => {
    if (isLoadingRef.current) {
      console.log("🚫 防止重复调用：loadPaginatedChecks已在执行中");
      return;
    }

    isLoadingRef.current = true;
    setIsLoadingChecks(true);

    console.log("🚀 开始loadPaginatedChecks调用:", {
      page,
      status,
      search,
      hashtags,
      sortBy,
      sortOrder,
      CHECK_HISTORY_ITEMS_PER_PAGE
    });

    try {
      // 构建查询参数
      const params = new URLSearchParams({
        page: page.toString(),
        limit: CHECK_HISTORY_ITEMS_PER_PAGE.toString(),
        include_results: "false", // 不包含大字段以提高性能
      });

      if (status && status !== null) {
        params.set("status", status);
      }
      if (search && search.trim()) {
        params.set("script_name", search.trim());
      }
      if (hashtags && hashtags.length > 0) {
        params.set("hashtags", hashtags.join(","));
      }
      if (sortBy) {
        params.set("sort_by", sortBy);
      }
      if (sortOrder) {
        params.set("sort_order", sortOrder);
      }

      const url = `/api/check-history?${params.toString()}`;
      console.log("🔍 [Dashboard-API] 准备调用API:", {
        url,
        page,
        status,
        search,
        hashtags,
        sortBy,
        sortOrder,
        "search是否为空": !search || search.trim() === "",
        "实际script_name参数": search && search.trim() ? search.trim() : "未设置",
        "完整params": Object.fromEntries(params.entries())
      });

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("📡 API响应状态:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API响应错误:", errorText);
        throw new Error(`获取检查历史失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📡 [Dashboard-API] API响应完整数据:", data);
      console.log("🔍 [Dashboard-API] 返回数据分析:", {
        "总记录数": data.pagination?.total || 0,
        "返回记录数": data.data?.length || 0,
        "查询信息": data.query_info,
        "API传递的script_name": data.query_info?.script_name,
        "搜索参数": search,
        "前5条数据": data.data?.slice(0, 5).map((item: Check) => ({
          script_name: item.script_name,
          execution_time: item.execution_time,
          status: item.status
        })) || [],
        "筛选效果检查": search ? {
          "搜索关键词": search,
          "匹配的记录数": data.data?.filter((item: Check) => 
            item.script_name?.toLowerCase().includes(search.toLowerCase())
          ).length || 0,
          "总记录数": data.data?.length || 0
        } : "无筛选条件"
      });

      // 更新检查数据
      if (data.data && Array.isArray(data.data)) {
        const processedChecks = data.data.map((check: Check) => ({
          ...check,
          createdAt: check.createdAt
            ? typeof check.createdAt === "string"
              ? check.createdAt
              : check.createdAt.toString()
            : new Date().toISOString(),
        }));

        console.log("✅ 处理后的检查数据:", processedChecks.slice(0, 2)); // 只显示前2条避免日志过长
        setChecks(processedChecks);
        console.log("🔄 setChecks完成，设置的数据长度:", processedChecks.length);
      } else {
        console.warn("⚠️ API返回的data.data不是数组:", data.data);
        setChecks([]);
      }

      // 更新分页信息
      if (data.pagination) {
        setPaginationInfo({
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
          hasNext: data.pagination.hasNext,
          hasPrev: data.pagination.hasPrev,
        });
        console.log("📊 分页信息更新:", data.pagination);
      } else {
        console.warn("⚠️ API返回的data.pagination不存在:", data.pagination);
      }

      console.log("📊 分页检查数据加载完成:", {
        page,
        totalChecks: data.pagination?.total || 0,
        returnedChecks: data.data?.length || 0,
        totalPages: data.pagination?.totalPages || 0,
        hashtags: hashtags?.length ? hashtags : "无",
        status: status || "全部",
        sortBy: sortBy || "execution_time",
        sortOrder: sortOrder || "desc",
      });

    } catch (err) {
      console.error("❌ 获取分页检查数据失败:", err);
      setError(err instanceof Error ? err.message : "数据加载失败");
      setChecks([]); // 确保在错误时清空数据
    } finally {
      setIsLoadingChecks(false);
      isLoadingRef.current = false;
      console.log("🏁 loadPaginatedChecks完成，isLoadingChecks:", false);
    }
  }, []);

  // 修改requestSort函数以支持后端排序
  const requestSort = (key: keyof Check) => {
    let newDirection: "ascending" | "descending";
    
    if (sortConfig.key === key) {
      newDirection = sortConfig.direction === "ascending" ? "descending" : "ascending";
    } else {
      newDirection = "descending";
    }

    setSortConfig({ key, direction: newDirection });
    setCurrentPage(1);

    // 转换为后端API期望的格式
    const sortBy = key === "execution_time" ? "execution_time" : "script_name";
    const sortOrder = newDirection === "ascending" ? "asc" : "desc";

    // 触发后端重新排序
    loadPaginatedChecks(1, filterStatus, searchTerm, selectedHashtags, sortBy, sortOrder);
  };

  // 处理页面变化
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    const sortBy = sortConfig.key === "execution_time" ? "execution_time" : 
                  sortConfig.key === "script_name" ? "script_name" : "execution_time";
    const sortOrder = sortConfig.direction === "ascending" ? "asc" : "desc";
    loadPaginatedChecks(newPage, filterStatus, searchTerm, selectedHashtags, sortBy, sortOrder);
  }, [loadPaginatedChecks, filterStatus, searchTerm, selectedHashtags, sortConfig]);

  // 处理状态过滤变化
  const handleFilterStatusChange = useCallback((status: string | null) => {
    setFilterStatus(status);
    setCurrentPage(1);
    const sortBy = sortConfig.key === "execution_time" ? "execution_time" : 
                  sortConfig.key === "script_name" ? "script_name" : "execution_time";
    const sortOrder = sortConfig.direction === "ascending" ? "asc" : "desc";
    loadPaginatedChecks(1, status, searchTerm, selectedHashtags, sortBy, sortOrder);
  }, [loadPaginatedChecks, searchTerm, selectedHashtags, sortConfig]);

  // 处理搜索变化
  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search);
    setCurrentPage(1);
    const sortBy = sortConfig.key === "execution_time" ? "execution_time" : 
                  sortConfig.key === "script_name" ? "script_name" : "execution_time";
    const sortOrder = sortConfig.direction === "ascending" ? "asc" : "desc";
    loadPaginatedChecks(1, filterStatus, search, selectedHashtags, sortBy, sortOrder);
  }, [loadPaginatedChecks, filterStatus, selectedHashtags, sortConfig]);

  // 处理hashtag变化  
  const handleHashtagsChange = useCallback((hashtags: string[]) => {
    setSelectedHashtags(hashtags);
    setCurrentPage(1);
    const sortBy = sortConfig.key === "execution_time" ? "execution_time" : 
                  sortConfig.key === "script_name" ? "script_name" : "execution_time";
    const sortOrder = sortConfig.direction === "ascending" ? "asc" : "desc";
    loadPaginatedChecks(1, filterStatus, searchTerm, hashtags, sortBy, sortOrder);
  }, [loadPaginatedChecks, filterStatus, searchTerm, sortConfig]);

  // 独立的脚本加载函数
  const loadScripts = useCallback(async () => {
    try {
      console.log("📋 开始加载脚本列表");
      
      const scriptsResult = await fetch("/api/list-scripts", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (scriptsResult.ok) {
        const scriptsResponseData = await scriptsResult.json();
        let scriptsData: ScriptInfo[] = [];

        // 处理不同的API响应格式
        if (scriptsResponseData && typeof scriptsResponseData === "object") {
          if (Array.isArray(scriptsResponseData)) {
            scriptsData = scriptsResponseData;
          } else if (
            scriptsResponseData.data &&
            Array.isArray(scriptsResponseData.data)
          ) {
            scriptsData = scriptsResponseData.data;
          } else if (
            scriptsResponseData.success &&
            Array.isArray(scriptsResponseData.data)
          ) {
            scriptsData = scriptsResponseData.data;
          } else if (
            scriptsResponseData.scripts &&
            Array.isArray(scriptsResponseData.scripts)
          ) {
            scriptsData = scriptsResponseData.scripts;
          } else {
            const possibleArrayFields = ["items", "results", "list"];
            for (const field of possibleArrayFields) {
              if (
                scriptsResponseData[field] &&
                Array.isArray(scriptsResponseData[field])
              ) {
                scriptsData = scriptsResponseData[field];
                break;
              }
            }
          }
        }

        if (!Array.isArray(scriptsData)) {
          scriptsData = [];
        }

        setAvailableScripts(scriptsData);

        if (process.env.NODE_ENV === "development") {
          console.log("📋 脚本数据加载完成:", {
            count: scriptsData.length,
            scripts: scriptsData.map(s => ({
              scriptId: s.scriptId,
              name: s.name,
              hashtags: s.hashtags
            }))
          });
        }
      } else {
        throw new Error(
          `脚本列表获取失败: ${scriptsResult.status} ${scriptsResult.statusText}`,
        );
      }
    } catch (err) {
      console.error("❌ 脚本加载失败:", err);
      throw err;
    }
  }, []);

  // 获取整体统计数据的函数
  const loadOverallStats = useCallback(async () => {
    try {
      // 获取更多数据用于统计计算 (获取最近2000条数据)
      const response = await fetch("/api/check-history?limit=2000&include_results=false", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`获取统计数据失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let statsData: Check[] = [];

      if (data.data && Array.isArray(data.data)) {
        statsData = data.data;
      }

      // 计算整体统计数据
      const overallSuccessCount = statsData.filter(
        (c) => c.status === "success" && c.statusType !== "attention_needed",
      ).length;
      const overallFailureCount = statsData.filter(
        (c) => c.status === "failure",
      ).length;
      const overallNeedsAttentionCount = statsData.filter(
        (c) => c.statusType === "attention_needed",
      ).length;
      const overallTotalCount = statsData.length;

      setOverallStats({
        totalCount: overallTotalCount,
        successCount: overallSuccessCount,
        failureCount: overallFailureCount,
        needsAttentionCount: overallNeedsAttentionCount,
      });

      console.log("📊 整体统计数据加载完成:", {
        totalChecks: overallTotalCount,
        successCount: overallSuccessCount,
        failureCount: overallFailureCount,
        needsAttentionCount: overallNeedsAttentionCount,
      });

    } catch (err) {
      console.error("获取整体统计数据失败:", err);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    // 防止重复调用 - 使用更强的防护机制
    if (isLoadingRef.current) {
      console.log("🚫 防止重复调用：loadInitialData已在执行中");
      return;
    }

    // 如果是搜索模式，跳过常规初始化中的执行历史加载
    if (isSearchMode) {
      console.log("🔍 [Dashboard] 搜索模式下跳过常规初始化的执行历史加载");
      return;
    }

    // 设置防护标志
    isLoadingRef.current = true;
    setLoading(true);
    setIsFetchingScripts(true);

    // 添加唯一的请求ID
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`🚀 开始数据加载请求 ${requestId}`);

    try {
      const scriptsRequest = fetch("/api/list-scripts", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
        },
      });
      // History and stats do not depend on the script list, so request all
      // three at once. The guard is released first because
      // loadPaginatedChecks skips while it is set.
      isLoadingRef.current = false;
      const [scriptsResult] = await Promise.all([
        scriptsRequest,
        loadPaginatedChecks(1, null, "", [], "execution_time", "desc"),
        loadOverallStats(),
      ]);

      console.log(`✅ API响应完成 ${requestId}:`, {
        scriptsOk: scriptsResult.ok,
      });

      // 处理脚本列表响应
      if (scriptsResult.ok) {
        const scriptsResponseData = await scriptsResult.json();
        let scriptsData: ScriptInfo[] = [];

        // 处理不同的API响应格式
        if (scriptsResponseData && typeof scriptsResponseData === "object") {
          if (Array.isArray(scriptsResponseData)) {
            scriptsData = scriptsResponseData;
          } else if (
            scriptsResponseData.data &&
            Array.isArray(scriptsResponseData.data)
          ) {
            scriptsData = scriptsResponseData.data;
          } else if (
            scriptsResponseData.success &&
            Array.isArray(scriptsResponseData.data)
          ) {
            scriptsData = scriptsResponseData.data;
          } else if (
            scriptsResponseData.scripts &&
            Array.isArray(scriptsResponseData.scripts)
          ) {
            scriptsData = scriptsResponseData.scripts;
          } else {
            const possibleArrayFields = ["items", "results", "list"];
            for (const field of possibleArrayFields) {
              if (
                scriptsResponseData[field] &&
                Array.isArray(scriptsResponseData[field])
              ) {
                scriptsData = scriptsResponseData[field];
                break;
              }
            }
          }
        }

        if (!Array.isArray(scriptsData)) {
          scriptsData = [];
        }

        setAvailableScripts(scriptsData);
        setIsFetchingScripts(false);

        if (process.env.NODE_ENV === "development") {
          console.log("📋 脚本数据加载完成:", {
            count: scriptsData.length,
            scripts: scriptsData.map(s => ({
              scriptId: s.scriptId,
              name: s.name,
              hashtags: s.hashtags
            }))
          });
        }
      } else {
        throw new Error(
          `脚本列表获取失败: ${scriptsResult.status} ${scriptsResult.statusText}`,
        );
      }


    } catch (err) {
      setError(err instanceof Error ? err.message : "数据加载失败");
      isLoadingRef.current = false; // 确保在错误时也重置标志
    } finally {
      setLoading(false);
    }
  }, [loadPaginatedChecks, loadOverallStats, isSearchMode]);

  useEffect(() => {
    // 检查URL参数中是否有搜索条件
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    
    console.log("🔍 [Dashboard] 组件初始化检查URL参数:", {
      searchParam,
      hasSearch: !!searchParam,
      fullURL: window.location.href
    });
    
    if (searchParam) {
      const cleanSearchParam = searchParam.trim();
      console.log("✅ [Dashboard] 检测到URL搜索参数:", cleanSearchParam);
      
      // 设置搜索模式标志
      setIsSearchMode(true);
      
      // 设置搜索条件到搜索框
      console.log("📝 [Dashboard] 设置搜索状态:", {
        searchTerm: cleanSearchParam,
        currentSearchTerm: searchTerm,
        filterStatus: filterStatus,
        selectedHashtags: selectedHashtags
      });
      
      setSearchTerm(cleanSearchParam);
      setFilterStatus(null);
      setCurrentPage(1);
      setSelectedHashtags([]);
      
      console.log("📝 [Dashboard] 搜索状态设置完成");
      
      // 清除URL参数以避免重复处理
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('search');
      window.history.replaceState({}, '', newUrl.toString());
      
      // 显示筛选通知
      toast.info(language === "zh" ? "正在筛选执行历史" : "Filtering run history", {
        description: language === "zh" ? `搜索脚本: ${cleanSearchParam}` : `Script: ${cleanSearchParam}`,
        duration: 3000,
      });
      
      // 延迟滚动到执行历史部分
      setTimeout(() => {
        const historyElement = document.getElementById("execution-history");
        if (historyElement) {
          console.log("🎯 [Dashboard] 滚动到执行历史部分");
          historyElement.scrollIntoView({ behavior: "smooth" });
        }
      }, 1000); // 延长滚动时间，等待搜索结果加载
      
      // 执行搜索的特殊初始化：只加载脚本和统计，搜索会通过useEffect触发
      console.log("🚀 [Dashboard] 执行搜索模式的初始化（脚本+统计）");
      // 重置防护标志，确保可以加载脚本和统计
      isLoadingRef.current = false;
      setLoading(true);
      setIsFetchingScripts(true);
      
      // 并行加载脚本列表和整体统计，但不加载默认的check history
      Promise.all([
        loadScripts(), // 只加载脚本
        loadOverallStats() // 只加载统计
      ]).then(() => {
        setLoading(false);
        setIsFetchingScripts(false);
        console.log("✅ [Dashboard] 搜索模式初始化完成，等待searchTerm触发搜索");
      }).catch(err => {
        setError(err instanceof Error ? err.message : "数据加载失败");
        setLoading(false);
        setIsFetchingScripts(false);
      });
      
    } else {
      // 常规初始化数据加载（只有在没有搜索参数时才执行）
      console.log("🚀 [Dashboard] 执行常规初始化数据加载");
      loadInitialData();
    }

    const now = new Date();
    const nextRun = new Date();
    // 设置下一个运行时间为芝加哥时间凌晨 3:00 (Chicago Central Time)
    // 芝加哥标准时间 CST = UTC-6，夏令时 CDT = UTC-5
    // 凌晨3:00 CST = UTC 9:00，凌晨3:00 CDT = UTC 8:00
    // 这里使用 UTC 8:00 来对应芝加哥夏令时凌晨3:00
    nextRun.setUTCHours(8, 0, 0, 0);
    // 如果 UTC 8:00 已经过去，则设置为明天的 UTC 8:00 (对应芝加哥时间凌晨3:00)
    if (nextRun < now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    //直接将 Date 对象传递给状态，显示时会由 formatDate 处理
    setNextScheduled(nextRun);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .animate-fadeIn { animation: fadeIn 0.5s ease-in-out; }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 移除loadInitialData依赖，避免重复调用

  // 监听searchTerm变化并自动触发搜索
  useEffect(() => {
    console.log("🎯 [Dashboard] useEffect[searchTerm] 被触发:", {
      searchTerm,
      trimmed: searchTerm?.trim(),
      isEmpty: !searchTerm || searchTerm.trim() === '',
      willSearch: searchTerm && searchTerm.trim() !== ''
    });
    
    // 跳过初始值和空值的搜索（防止不必要的API调用）
    if (searchTerm && searchTerm.trim() !== '') {
      console.log("🔍 [Dashboard] searchTerm变化，触发搜索:", searchTerm);
      const sortBy = sortConfig.key === "execution_time" ? "execution_time" : 
                    sortConfig.key === "script_name" ? "script_name" : "execution_time";
      const sortOrder = sortConfig.direction === "ascending" ? "asc" : "desc";
      
      console.log("🚀 [Dashboard] 调用loadPaginatedChecks参数:", {
        page: 1,
        filterStatus,
        searchTerm,
        selectedHashtags,
        sortBy,
        sortOrder
      });
      
      loadPaginatedChecks(1, filterStatus, searchTerm, selectedHashtags, sortBy, sortOrder);
    } else {
      console.log("⏭️ [Dashboard] searchTerm为空或无效，跳过搜索");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // 只监听searchTerm变化，避免其他依赖项导致的重复调用

  // 注意：searchTerm变化触发筛选的逻辑已移到初始化useEffect中处理，避免重复调用

  useEffect(() => {
    // Only set a default if no script is currently selected AND there are available scripts
    if (
      !selectedScriptId &&
      Array.isArray(availableScripts) &&
      availableScripts.length > 0
    ) {
      stableSetSelectedScriptId(availableScripts[0].scriptId);
    }
    // If scripts become unavailable AND a script was previously selected, clear the selection
    else if (
      selectedScriptId &&
      (!Array.isArray(availableScripts) || availableScripts.length === 0)
    ) {
      stableSetSelectedScriptId("");
    }
  }, [availableScripts, selectedScriptId, stableSetSelectedScriptId]);

  // 调试：监控状态变化
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 availableScripts 状态变化:", {
        length: Array.isArray(availableScripts)
          ? availableScripts.length
          : "not array",
        data: availableScripts,
      });
    }
  }, [availableScripts]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 checks 状态变化:", {
        length: Array.isArray(checks) ? checks.length : "not array",
        data: checks.slice(0, 2), // 只显示前两条以避免日志过长
      });
    }
  }, [checks]);

  const handleTriggerCheck = useCallback(async () => {
    if (!selectedScriptId || isTriggering) return;

    setIsTriggering(true);
    setTriggerMessage(null);
    setTriggerMessageType(null);

    try {
      const response = await fetch("/api/run-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId: selectedScriptId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Trigger failed");
      }

      const successMessage =
        result.localizedMessage ||
        result.message ||
        "Script triggered successfully";
      setTriggerMessage(successMessage);
      setTriggerMessageType("success");

      toast.success("Trigger Success", {
        description: successMessage,
        duration: 5000,
      });

      // 刷新数据
      await loadInitialData();
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to trigger check:", err);
      }
      const errorMessage =
        err instanceof Error
          ? err.message || "Trigger failed"
          : "Trigger failed";
      // 尝试提取本地化错误消息
      let localizedErrorMessage = errorMessage;
      try {
        if (
          err instanceof Error &&
          err.cause &&
          typeof err.cause === "object"
        ) {
          const cause = err.cause as Record<string, unknown>;
          if (
            "localizedMessage" in cause &&
            typeof cause.localizedMessage === "string"
          ) {
            localizedErrorMessage = cause.localizedMessage;
          }
        }
      } catch (extractError) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error extracting localized message:", extractError);
        }
        // 出错时使用默认错误消息
      }

      setTriggerMessage(localizedErrorMessage);
      setTriggerMessageType("error");
      toast.error("Trigger Failed", {
        description: localizedErrorMessage,
        duration: 8000,
      });
    } finally {
      setIsTriggering(false);
      setTimeout(() => {
        setTriggerMessage(null);
        setTriggerMessageType(null);
      }, 8000);
    }
  }, [selectedScriptId, isTriggering, loadInitialData]); // 移除language依赖

  // 由于现在使用后端分页，直接使用checks作为分页数据
  const paginatedChecks = checks;
  const totalChecks = paginationInfo.total;
  const totalPages = paginationInfo.totalPages;
  const startIndex = totalChecks > 0 ? (currentPage - 1) * CHECK_HISTORY_ITEMS_PER_PAGE : 0;
  const endIndex = Math.min(currentPage * CHECK_HISTORY_ITEMS_PER_PAGE, totalChecks);

  const selectedScript = React.useMemo(
    () =>
      Array.isArray(availableScripts)
        ? availableScripts.find((s) => s.scriptId === selectedScriptId)
        : undefined,
    [availableScripts, selectedScriptId],
  );

  // 使用整体统计数据而不是显示数据进行统计计算
  const successCount = overallStats.successCount;
  const failureCount = overallStats.failureCount;
  const needsAttentionCount = overallStats.needsAttentionCount;
  const allChecksCount = overallStats.totalCount;
  const successRate =
    allChecksCount > 0 ? Math.round((successCount / allChecksCount) * 100) : 0;

  // 调试信息
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Dashboard渲染状态:");
    console.log("  - loading:", loading);
    console.log("  - isLoadingChecks:", isLoadingChecks);
    console.log("  - isFetchingScripts:", isFetchingScripts);
    console.log("  - checks length:", checks.length);
    console.log("  - paginatedChecks length:", paginatedChecks.length);
    console.log("  - searchTerm:", `"${searchTerm}"`);
    console.log("  - filterStatus:", filterStatus);
    console.log("  - currentPage:", currentPage);
    console.log("  - totalChecks:", totalChecks);
    console.log("  - availableScripts length:", availableScripts.length);
  }

  if (loading && checks.length === 0 && isFetchingScripts) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonTable />
      </div>
    );
  }

  if (error) {
    return <LoadingError error={error} t={t} />;
  }

  return (
    <div className="space-y-10 animate-fadeIn">
          <header className="space-y-1">
            <h1 className="text-[28px] leading-tight font-semibold">
              {t("dashboardTitle")}
            </h1>
            {nextScheduled && (
              <p className="text-[13px] text-muted-foreground">
                {t("nextScheduledCheck")}:{" "}
                {nextScheduled.toLocaleString(language, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </header>

          {/* Manual Trigger & Stats Combined Section */}
          <section className="grid gap-6 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-8">
                <ManualTrigger
                  availableScripts={availableScripts}
                  selectedScriptId={selectedScriptId}
                  selectedScript={selectedScript}
                  isTriggering={isTriggering}
                  isFetchingScripts={isFetchingScripts}
                  loading={loading && isFetchingScripts}
                  triggerMessage={triggerMessage}
                  triggerMessageType={triggerMessageType}
                  language={language}
                  t={t}
                  setSelectedScriptId={stableSetSelectedScriptId}
                  handleTriggerCheck={handleTriggerCheck}
                />
              </div>
              
              <div className="min-w-0 lg:col-span-4">
                <StatsCards
                  nextScheduled={nextScheduled}
                  successCount={successCount}
                  allChecksCount={allChecksCount}
                  needsAttentionCount={needsAttentionCount}
                  successRate={successRate}
                  language={language}
                  t={t}
                  isVerticalLayout={true}
                />
              </div>
          </section>

          {/* Check History Section */}
          <section id="execution-history" className="scroll-mt-20 space-y-4">
            <h2 className="text-[23px] leading-tight font-semibold">
              {t("checkHistoryTitle")}
            </h2>

            <CheckHistory
              paginatedChecks={paginatedChecks}
              allChecksCount={totalChecks}
              totalUnfilteredCount={allChecksCount}
              totalPages={totalPages}
              currentPage={currentPage}
              filterStatus={filterStatus}
              searchTerm={searchTerm}
              selectedHashtags={selectedHashtags}
              sortConfig={sortConfig}
              successCount={successCount}
              failureCount={failureCount}
              needsAttentionCount={needsAttentionCount}
              language={language}
              t={t}
              setFilterStatus={handleFilterStatusChange}
              setSearchTerm={handleSearchChange}
              setSelectedHashtags={handleHashtagsChange}
              setCurrentPage={handlePageChange}
              requestSort={requestSort}
              startIndex={startIndex}
              endIndex={endIndex}
              availableScripts={availableScripts}
              isLoading={isLoadingChecks || loading}
            />
          </section>

          {/* Footer Section */}
          <section className="border-t">
            <DashboardFooter t={t} />
          </section>
    </div>
  );
};

export default Dashboard;
