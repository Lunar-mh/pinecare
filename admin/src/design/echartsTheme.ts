import * as echarts from 'echarts'

let isRegistered = false

/**
 * 注册暖玉微晶 ECharts 适老化设计主题
 * 色彩：翡翠松青(#1F6B56)、暖栗琥珀(#C86D3B)、朱砂朱雀(#D33833)
 * 特性：适老粗折线(3.5px)、大字号(14~16px)、通透微晶毛玻璃 Tooltip
 */
export function registerWarmJadeTheme(): void {
  if (isRegistered) return

  echarts.registerTheme('warm-jade', {
    color: ['#1F6B56', '#C86D3B', '#D33833', '#4F8D66', '#4A7594', '#935B8A'],
    backgroundColor: 'transparent',
    textStyle: {
      color: '#18221E',
      fontSize: 14,
      fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    title: {
      textStyle: {
        color: '#18221E',
        fontSize: 18,
        fontWeight: 700,
      },
      subtextStyle: {
        color: '#485750',
        fontSize: 13,
      },
    },
    line: {
      itemStyle: {
        borderWidth: 2,
      },
      lineStyle: {
        width: 3.5, // 适老粗折线
      },
      symbolSize: 8,
      smooth: true,
    },
    bar: {
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
      },
      barMaxWidth: 36,
    },
    pie: {
      itemStyle: {
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    },
    categoryAxis: {
      axisLine: {
        show: true,
        lineStyle: {
          color: 'rgba(210, 225, 218, 0.8)',
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#485750',
        fontSize: 13,
      },
      splitLine: {
        show: false,
      },
    },
    valueAxis: {
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#485750',
        fontSize: 13,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(227, 216, 200, 0.45)',
          type: 'dashed',
        },
      },
    },
    legend: {
      textStyle: {
        color: '#18221E',
        fontSize: 14,
      },
      itemWidth: 16,
      itemHeight: 12,
      itemGap: 16,
    },
    tooltip: {
      backgroundColor: 'rgba(255, 253, 250, 0.96)',
      borderColor: 'rgba(31, 107, 86, 0.25)',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: {
        color: '#18221E',
        fontSize: 15, // 适老可读大字
      },
      extraCssText: 'box-shadow: 0 12px 32px rgba(31, 55, 45, 0.12); border-radius: 12px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);',
    },
  })

  isRegistered = true
}
