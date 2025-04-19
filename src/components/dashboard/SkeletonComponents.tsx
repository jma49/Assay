import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ITEMS_PER_PAGE } from './types';

export const SkeletonCard = () => (
  <Card>
    <CardHeader className="space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-1/2" />
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const SkeletonTable = () => (
  <Card>
    <CardHeader className="space-y-2">
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-4 w-2/5" />
    </CardHeader>
    <CardContent className="space-y-4">
      {Array(ITEMS_PER_PAGE).fill(0).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </CardContent>
  </Card>
); 