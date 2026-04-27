"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useRankSnapshots } from "../api/use-rank";

interface RankHistoryChartProps {
  targetId?: string;
}

export function RankHistoryChart({ targetId }: RankHistoryChartProps) {
  const { data, isLoading, error } = useRankSnapshots(targetId);

  const chartData = useMemo(() => {
    if (!data?.snapshots) return [];
    return [...data.snapshots].reverse().map((item) => ({
      ...item,
      displayDate: format(parseISO(item.checkedAt), "MM/dd"),
      rank: item.rank === 0 ? null : item.rank,
    }));
  }, [data]);

  if (!targetId) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-xl bg-card/50 text-muted-foreground text-sm mt-4">
        추적 대상을 선택하면 순위 변동 차트가 표시됩니다.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-xl bg-card animate-pulse mt-4">
        <p className="text-sm text-muted-foreground">순위 데이터 불러오는 중...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-xl bg-destructive/10 text-destructive text-sm mt-4">
        데이터를 불러오는 중 오류가 발생했습니다.
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-xl bg-card text-muted-foreground text-sm mt-4">
        아직 수집된 순위 데이터가 없습니다. (매일 갱신)
      </div>
    );
  }

  return (
    <div className="h-64 w-full mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis 
            dataKey="displayDate" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} 
            dy={10} 
          />
          <YAxis 
            reversed={true} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} 
            domain={[1, 'dataMax + 10']}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "8px" }}
            itemStyle={{ color: "var(--color-foreground)" }}
            formatter={(value: any) => [`${value}위`, "순위"]}
            labelFormatter={(label: any) => `${label} 기록`}
          />
          <Line
            type="monotone"
            dataKey="rank"
            stroke="var(--color-primary)"
            strokeWidth={3}
            dot={{ r: 4, fill: "var(--color-card)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "var(--color-primary)", stroke: "var(--color-background)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}