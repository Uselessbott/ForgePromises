import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Rect, Line, Text as SvgText, Path, Circle, Defs, LinearGradient, Stop, G, ClipPath,
} from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

interface BarDayItem {
  date: string;
  label: string;
  percentage: number;
  completed: number;
  total: number;
}

interface WeeklyBarChartProps {
  data: BarDayItem[];
  colors: any;
  height?: number;
}

export function WeeklyBarChart({ data, colors, height = 160 }: WeeklyBarChartProps) {
  const paddingH = 12;
  const paddingTop = 12;
  const paddingBottom = 36;
  const chartH = height - paddingTop - paddingBottom;
  const width = 320;
  const barCount = data.length;
  const gap = 8;
  const barW = (width - paddingH * 2 - gap * (barCount - 1)) / barCount;
  const today = new Date().toISOString().split('T')[0];

  function barColor(pct: number, hasHabits: boolean, isToday: boolean): string {
    if (!hasHabits) return colors.border;
    if (isToday && pct === 0) return colors.primary + '44';
    if (pct === 0) return '#ef4444' + '66';
    if (pct < 50) return '#eab308' + 'CC';
    if (pct < 100) return colors.primary + 'CC';
    return '#22c55e';
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height} style={{ overflow: 'visible' }}>
        {[0, 25, 50, 75, 100].map(pct => {
          const y = paddingTop + chartH - (pct / 100) * chartH;
          return (
            <G key={pct}>
              <Line x1={paddingH} y1={y} x2={width - paddingH} y2={y} stroke={colors.border} strokeWidth={0.5} strokeDasharray={pct === 0 ? '0' : '3,3'} />
              {pct > 0 && <SvgText x={paddingH - 4} y={y + 4} fontSize={9} fill={colors.mutedForeground} textAnchor="end">{pct}</SvgText>}
            </G>
          );
        })}
        {data.map((day, i) => {
          const x = paddingH + i * (barW + gap);
          const barH = Math.max(4, (day.percentage / 100) * chartH);
          const y = paddingTop + chartH - barH;
          const isToday = day.date === today;
          const fill = barColor(day.percentage, day.total > 0, isToday);
          return (
            <G key={i}>
              <Rect x={x} y={paddingTop} width={barW} height={chartH} rx={6} fill={colors.border + '44'} />
              <Rect x={x} y={y} width={barW} height={barH} rx={6} fill={fill} />
              {isToday && <Rect x={x} y={paddingTop + chartH + 6} width={barW} height={3} rx={1.5} fill={colors.primary} />}
              <SvgText x={x + barW / 2} y={paddingTop + chartH + 24} fontSize={11} fontWeight={isToday ? 'bold' : 'normal'} fill={isToday ? colors.primary : colors.mutedForeground} textAnchor="middle">{day.label}</SvgText>
              {day.total > 0 && day.percentage > 0 && <SvgText x={x + barW / 2} y={y - 4} fontSize={9} fill={colors.mutedForeground} textAnchor="middle">{day.percentage}%</SvgText>}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

interface MonthlyLineChartProps {
  data: number[];
  colors: any;
  height?: number;
}

export function MonthlyLineChart({ data, colors, height = 140 }: MonthlyLineChartProps) {
  const paddingH = 24;
  const paddingTop = 12;
  const paddingBottom = 28;
  const chartH = height - paddingTop - paddingBottom;
  const width = 320;
  const chartW = width - paddingH * 2;
  const nonZeroData = data.filter(p => p > 0);

  if (nonZeroData.length < 2) {
    return (
      <View style={{ alignItems: 'center', height, justifyContent: 'center' }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' }}>Not enough data yet</Text>
      </View>
    );
  }

  function xPos(i: number): number { return paddingH + (i / Math.max(1, data.length - 1)) * chartW; }
  function yPos(pct: number): number { return paddingTop + chartH - (pct / 100) * chartH; }

  const activePoints = data.map((pct, i) => ({ pct, i })).filter(p => p.pct > 0);
  const pathPoints = activePoints.map(p => `${xPos(p.i)},${yPos(p.pct)}`);
  const linePath = `M ${pathPoints.join(' L ')}`;
  const firstX = xPos(activePoints[0].i);
  const lastX = xPos(activePoints[activePoints.length - 1].i);
  const areaPath = `M ${firstX},${yPos(activePoints[0].pct)} L ${pathPoints.slice(1).join(' L ')} L ${lastX},${paddingTop + chartH} L ${firstX},${paddingTop + chartH} Z`;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height} style={{ overflow: 'visible' }}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.3} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[0, 50, 100].map(pct => (
          <G key={pct}>
            <Line x1={paddingH} y1={yPos(pct)} x2={width - paddingH} y2={yPos(pct)} stroke={colors.border} strokeWidth={0.5} strokeDasharray={pct === 0 ? '0' : '3,3'} />
            <SvgText x={paddingH - 4} y={yPos(pct) + 4} fontSize={9} fill={colors.mutedForeground} textAnchor="end">{pct}</SvgText>
          </G>
        ))}
        <Path d={areaPath} fill="url(#areaGrad)" />
        <Path d={linePath} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {activePoints.map((p, idx) => (
          <Circle key={idx} cx={xPos(p.i)} cy={yPos(p.pct)} r={3} fill={p.pct === 100 ? '#22c55e' : p.pct > 0 ? colors.primary : '#ef4444'} stroke={colors.background} strokeWidth={1} />
        ))}
        {[0, 10, 20, 29].map(d => (
          <SvgText key={d} x={xPos(d)} y={height - 6} fontSize={9} fill={colors.mutedForeground} textAnchor="middle">{d + 1}</SvgText>
        ))}
      </Svg>
    </View>
  );
}

interface PieChartProps {
  completed: number;
  missed: number;
  total?: number;
  title: string;
  colors: any;
  size?: number;
}

export function PieChart({ completed, missed, total: totalProp, title, colors, size = 120 }: PieChartProps) {
  const total = totalProp ?? (completed + missed);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const strokeW = 22;
  const completionPct = completed / total;
  const circumference = 2 * Math.PI * r;
  const completedAngle = completionPct * 360;

  function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(startAngle: number, endAngle: number): string {
    const start = polarToCart(cx, cy, r, startAngle);
    const end = polarToCart(cx, cy, r, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  return (
    <View style={[pieStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[pieStyles.title, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
      <View style={pieStyles.content}>
        <View style={{ position: 'relative', width: size, height: size }}>
          <Svg width={size} height={size}>
            <Circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.border} strokeWidth={strokeW} />
            {completedAngle > 0 && completedAngle < 360 && (
              <Path
                d={describeArc(0, completedAngle)}
                fill="none"
                stroke="#22c55e"
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
            )}
            {completedAngle >= 360 && (
              <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth={strokeW} />
            )}
            {completedAngle > 0 && completedAngle < 360 && (
              <Path
                d={describeArc(completedAngle, 360)}
                fill="none"
                stroke="#ef4444"
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
            )}
          </Svg>
          <View style={[pieStyles.centerText, { width: size, height: size }]}>
            <Text style={[pieStyles.centerPct, { color: colors.foreground }]}>{Math.round(completionPct * 100)}%</Text>
          </View>
        </View>
        <View style={pieStyles.legend}>
          <View style={pieStyles.legendItem}>
            <View style={[pieStyles.legendDot, { backgroundColor: '#22c55e' }]} />
            <View>
              <Text style={[pieStyles.legendNum, { color: '#22c55e' }]}>{completed}</Text>
              <Text style={[pieStyles.legendLabel, { color: colors.mutedForeground }]}>Done</Text>
            </View>
          </View>
          <View style={pieStyles.legendItem}>
            <View style={[pieStyles.legendDot, { backgroundColor: '#ef4444' }]} />
            <View>
              <Text style={[pieStyles.legendNum, { color: '#ef4444' }]}>{missed}</Text>
              <Text style={[pieStyles.legendLabel, { color: colors.mutedForeground }]}>Missed</Text>
            </View>
          </View>
          <View style={pieStyles.legendItem}>
            <View style={[pieStyles.legendDot, { backgroundColor: colors.border }]} />
            <View>
              <Text style={[pieStyles.legendNum, { color: colors.foreground }]}>{total}</Text>
              <Text style={[pieStyles.legendLabel, { color: colors.mutedForeground }]}>Total</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const pieStyles = StyleSheet.create({
  container: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  title: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, marginBottom: 12 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  centerText: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  centerPct: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  legend: { flex: 1, gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendNum: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  legendLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});

interface StreakBarProps {
  label: string;
  emoji: string;
  value: number;
  max: number;
  color: string;
}

export function StreakBar({ label, emoji, value, max, color }: StreakBarProps) {
  const colors = useColors();
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={sbStyles.row}>
      <Text style={sbStyles.emoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <View style={sbStyles.labelRow}>
          <Text style={[sbStyles.label, { color: colors.foreground }]} numberOfLines={1}>{label}</Text>
          <Text style={[sbStyles.val, { color }]}>🔥 {value}</Text>
        </View>
        <View style={[sbStyles.track, { backgroundColor: colors.border }]}>
          <View style={[sbStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

const sbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  emoji: { fontSize: 20, width: 28, textAlign: 'center' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  val: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
