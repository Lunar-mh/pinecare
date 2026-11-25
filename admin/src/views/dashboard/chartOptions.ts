import * as echarts from 'echarts'

const TREND_HOURS = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00']

export function buildTrendChartOption(pendingAlerts: number): echarts.EChartsOption {
  const baseAlert = pendingAlerts || 1
  const trendData = [
    Math.max(0, baseAlert - 1),
    Math.max(0, baseAlert),
    Math.max(1, baseAlert + 1),
    baseAlert + 3,
    baseAlert + 2,
    baseAlert + 4,
    baseAlert + 1,
    baseAlert + 2,
    baseAlert,
  ]

  return {
    grid: { left: '3%', right: '4%', top: '15%', bottom: '10%', containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter:
        '{b}<br/><span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:#1F6B56;"></span>告警频次: <strong>{c} 次</strong>',
    },
    xAxis: {
      type: 'category',
      data: TREND_HOURS,
      boundaryGap: false,
      axisLine: { lineStyle: { color: 'rgba(210, 225, 218, 0.8)' } },
      axisLabel: { color: '#485750', fontSize: 13 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: 'rgba(227, 216, 200, 0.45)', type: 'dashed' } },
      axisLabel: { color: '#485750', fontSize: 13 },
    },
    series: [
      {
        name: '24h 告警频次',
        type: 'line',
        data: trendData,
        smooth: true,
        lineStyle: { width: 3.5, color: '#1F6B56' },
        itemStyle: { color: '#1F6B56', borderWidth: 2, borderColor: '#ffffff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(31, 107, 86, 0.28)' },
            { offset: 1, color: 'rgba(31, 107, 86, 0.01)' },
          ]),
        },
      },
    ],
  }
}

export function buildRadarChartOption(pendingAlerts: number): echarts.EChartsOption {
  const radarValues = [
    Math.min(90, 45 + pendingAlerts * 10),
    Math.min(85, 30 + pendingAlerts * 8),
    Math.min(80, 25 + pendingAlerts * 5),
    Math.min(95, 50 + pendingAlerts * 12),
    Math.min(75, 20 + pendingAlerts * 6),
  ]

  return {
    tooltip: { trigger: 'item' },
    radar: {
      indicator: [
        { name: 'SOS呼叫', max: 100 },
        { name: '异常跌倒', max: 100 },
        { name: '夜间离床', max: 100 },
        { name: '用药漏服', max: 100 },
        { name: '体征越界', max: 100 },
      ],
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: '#18221E', fontSize: 13, fontWeight: 600 },
      splitLine: { lineStyle: { color: 'rgba(210, 225, 218, 0.65)' } },
      splitArea: {
        show: true,
        areaStyle: { color: ['rgba(248, 246, 240, 0.3)', 'rgba(248, 246, 240, 0.6)'] },
      },
      axisLine: { lineStyle: { color: 'rgba(210, 225, 218, 0.6)' } },
    },
    series: [
      {
        name: '健康风险态势',
        type: 'radar',
        data: [
          {
            value: radarValues,
            name: '当前风险指数',
            symbolSize: 6,
            itemStyle: { color: '#C86D3B' },
            lineStyle: { width: 2.5, color: '#C86D3B' },
            areaStyle: { color: 'rgba(200, 109, 59, 0.22)' },
          },
        ],
      },
    ],
  }
}
