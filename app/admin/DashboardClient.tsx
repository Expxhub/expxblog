'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface AnalyticsData {
  period: string
  days: number
  totalViews: number
  uniqueVisitors: number
  prevTotalViews: number
  prevUniqueVisitors: number
  topPosts: Array<{
    post_id: number | null
    post_slug: string | null
    post_title: string | null
    views: number
  }>
  viewsByDay: Array<{ date: string; views: number; unique: number }>
  viewsByHour: Array<{ hour: number; label: string; views: number }>
  viewsByWeekday: Array<{ weekday: string; weekdayIndex: number; views: number }>
  referrers: Array<{ referrer: string; views: number }>
  pageTypes: Array<{ type: string; views: number }>
  todayViews: number
  yesterdayViews: number
  onlineNow: number
}

interface BlogStats {
  total: number
  published: number
  drafts: number
  categories: number
  tags: number
}

function calcChange(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) return { value: current > 0 ? '+100%' : '0%', positive: current > 0 }
  const pct = ((current - previous) / previous) * 100
  return { value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, positive: pct >= 0 }
}

export default function DashboardClient() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [stats, setStats] = useState<BlogStats>({ total: 0, published: 0, drafts: 0, categories: 0, tags: 0 })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [analyticsRes, blogRes] = await Promise.all([
        fetch(`/api/admin/analytics?period=${period}`),
        fetch('/api/admin/posts?limit=1'),
      ])
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json())
      if (blogRes.ok) {
        const d = await blogRes.json()
        setStats((s) => ({ ...s, total: d.total ?? 0 }))
      }

      const [pubRes, catRes, tagRes] = await Promise.all([
        fetch('/api/admin/posts?limit=1&status=published'),
        fetch('/api/admin/categories'),
        fetch('/api/admin/tags'),
      ])
      if (pubRes.ok) {
        const d = await pubRes.json()
        setStats((s) => ({ ...s, published: d.total ?? 0, drafts: s.total - (d.total ?? 0) }))
      }
      if (catRes.ok) {
        const d = await catRes.json()
        setStats((s) => ({ ...s, categories: d.categories?.length ?? 0 }))
      }
      if (tagRes.ok) {
        const d = await tagRes.json()
        setStats((s) => ({ ...s, tags: d.tags?.length ?? 0 }))
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const periods = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: '365d', label: '12m' },
  ]

  const d = analytics
  const viewsChange = d ? calcChange(d.totalViews, d.prevTotalViews) : { value: '0%', positive: true }
  const visitorsChange = d ? calcChange(d.uniqueVisitors, d.prevUniqueVisitors) : { value: '0%', positive: true }
  const todayChange = d ? calcChange(d.todayViews, d.yesterdayViews) : { value: '0%', positive: true }

  const dailyChartData = d
    ? {
        labels: d.viewsByDay.map((v) =>
          new Date(v.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        ),
        datasets: [
          {
            label: 'Views',
            data: d.viewsByDay.map((v) => v.views),
            borderColor: 'rgba(26, 79, 160, 1)',
            backgroundColor: 'rgba(26, 79, 160, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: d.viewsByDay.length > 60 ? 0 : 3,
            pointHoverRadius: 5,
          },
          {
            label: 'Unicos',
            data: d.viewsByDay.map((v) => v.unique),
            borderColor: 'rgba(139, 92, 246, 1)',
            backgroundColor: 'rgba(139, 92, 246, 0.05)',
            fill: true,
            tension: 0.4,
            pointRadius: d.viewsByDay.length > 60 ? 0 : 3,
            pointHoverRadius: 5,
          },
        ],
      }
    : null

  const hourlyChartData = d
    ? {
        labels: d.viewsByHour.map((h) => `${h.hour}h`),
        datasets: [
          {
            label: 'Views',
            data: d.viewsByHour.map((h) => h.views),
            backgroundColor: d.viewsByHour.map((h, i) =>
              h.views === Math.max(...d.viewsByHour.map((x) => x.views))
                ? 'rgba(245, 138, 45, 0.9)'
                : 'rgba(26, 79, 160, 0.7)'
            ),
            borderRadius: 4,
          },
        ],
      }
    : null

  const weekdayChartData = d
    ? {
        labels: d.viewsByWeekday.map((w) => w.weekday),
        datasets: [
          {
            label: 'Views',
            data: d.viewsByWeekday.map((w) => w.views),
            backgroundColor: d.viewsByWeekday.map((w) =>
              w.views === Math.max(...d.viewsByWeekday.map((x) => x.views))
                ? 'rgba(245, 138, 45, 0.9)'
                : 'rgba(26, 79, 160, 0.7)'
            ),
            borderRadius: 4,
          },
        ],
      }
    : null

  const pageTypeChartData = d && d.pageTypes.length > 0
    ? {
        labels: d.pageTypes.map((p) => p.type),
        datasets: [
          {
            data: d.pageTypes.map((p) => p.views),
            backgroundColor: [
              'rgba(26, 79, 160, 0.85)',
              'rgba(245, 138, 45, 0.85)',
              'rgba(34, 197, 94, 0.85)',
              'rgba(139, 92, 246, 0.85)',
              'rgba(236, 72, 153, 0.85)',
              'rgba(107, 114, 128, 0.85)',
            ],
            borderWidth: 0,
          },
        ],
      }
    : null

  const topPostsChartData = d && d.topPosts.length > 0
    ? {
        labels: d.topPosts.map((p) => p.post_title || 'Removido'),
        datasets: [
          {
            label: 'Views',
            data: d.topPosts.map((p) => p.views),
            backgroundColor: 'rgba(26, 79, 160, 0.7)',
            borderRadius: 4,
          },
        ],
      }
    : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: '#9ca3af', maxRotation: 45 },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 }, color: '#9ca3af' },
        beginAtZero: true,
      },
    },
  }

  const lineOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 11 }, boxWidth: 12, padding: 16 },
      },
    },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p.value
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link
            href="/admin/artigos/novo"
            className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors"
          >
            + Novo Artigo
          </Link>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="rounded-xl p-4 bg-blue-50 border border-blue-100">
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Views</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${viewsChange.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {viewsChange.value}
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-1">{d?.totalViews.toLocaleString('pt-BR') || 0}</p>
              <p className="text-[10px] text-blue-400 mt-0.5">vs periodo anterior</p>
            </div>

            <div className="rounded-xl p-4 bg-purple-50 border border-purple-100">
              <div className="flex items-center justify-between">
                <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Unicos</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${visitorsChange.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {visitorsChange.value}
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-700 mt-1">{d?.uniqueVisitors.toLocaleString('pt-BR') || 0}</p>
              <p className="text-[10px] text-purple-400 mt-0.5">visitantes unicos</p>
            </div>

            <div className="rounded-xl p-4 bg-green-50 border border-green-100">
              <div className="flex items-center justify-between">
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Hoje</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${todayChange.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {todayChange.value}
                </span>
              </div>
              <p className="text-2xl font-bold text-green-700 mt-1">{d?.todayViews.toLocaleString('pt-BR') || 0}</p>
              <p className="text-[10px] text-green-400 mt-0.5">vs ontem</p>
            </div>

            <div className="rounded-xl p-4 bg-orange-50 border border-orange-100">
              <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Media/dia</p>
              <p className="text-2xl font-bold text-orange-700 mt-1">
                {d && d.totalViews > 0 ? (d.totalViews / d.days).toFixed(1) : '0'}
              </p>
              <p className="text-[10px] text-orange-400 mt-0.5">views por dia</p>
            </div>

            <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Online</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <p className="text-2xl font-bold text-emerald-700">{d?.onlineNow || 0}</p>
              </div>
              <p className="text-[10px] text-emerald-400 mt-0.5">ultimos 5 min</p>
            </div>

            <div className="rounded-xl p-4 bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Pgs/Visitante</p>
              <p className="text-2xl font-bold text-gray-700 mt-1">
                {d && d.totalViews > 0 ? (d.totalViews / Math.max(d.uniqueVisitors, 1)).toFixed(1) : '0'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">profundidade</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl p-4 bg-white border border-gray-200">
              <p className="text-xs text-gray-500 font-medium">Publicados</p>
              <p className="text-xl font-bold text-green-600 mt-1">{stats.published}</p>
            </div>
            <div className="rounded-xl p-4 bg-white border border-gray-200">
              <p className="text-xs text-gray-500 font-medium">Rascunhos</p>
              <p className="text-xl font-bold text-yellow-600 mt-1">{stats.drafts}</p>
            </div>
            <div className="rounded-xl p-4 bg-white border border-gray-200">
              <p className="text-xs text-gray-500 font-medium">Categorias</p>
              <p className="text-xl font-bold text-brand-primary mt-1">{stats.categories}</p>
            </div>
            <div className="rounded-xl p-4 bg-white border border-gray-200">
              <p className="text-xs text-gray-500 font-medium">Tags</p>
              <p className="text-xl font-bold text-brand-secondary mt-1">{stats.tags}</p>
            </div>
          </div>

          {dailyChartData && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Tendencia de acessos</h2>
              <div className="h-64">
                <Line data={dailyChartData} options={lineOptions} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {hourlyChartData && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-neutral-900 mb-4">Acessos por hora</h2>
                <div className="h-56">
                  <Bar data={hourlyChartData} options={chartOptions} />
                </div>
              </div>
            )}

            {weekdayChartData && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-neutral-900 mb-4">Acessos por dia da semana</h2>
                <div className="h-56">
                  <Bar data={weekdayChartData} options={chartOptions} />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {topPostsChartData && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
                <h2 className="text-sm font-semibold text-neutral-900 mb-4">Artigos mais vistos</h2>
                <div className="h-64">
                  <Bar
                    data={topPostsChartData}
                    options={{
                      ...chartOptions,
                      indexAxis: 'y' as const,
                      plugins: {
                        ...chartOptions.plugins,
                        tooltip: {
                          ...chartOptions.plugins.tooltip,
                          callbacks: {
                            title: (items) => {
                              const idx = items[0].dataIndex
                              const post = d?.topPosts[idx]
                              return post?.post_title || 'Removido'
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-6">
              {pageTypeChartData && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-neutral-900 mb-3">Tipos de pagina</h2>
                  <div className="h-44">
                    <Doughnut
                      data={pageTypeChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '65%',
                        plugins: {
                          legend: {
                            position: 'right' as const,
                            labels: { font: { size: 11 }, boxWidth: 10, padding: 8 },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {d && d.referrers.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1">
                  <h2 className="text-sm font-semibold text-neutral-900 mb-3">Origem do trafego</h2>
                  <div className="space-y-2">
                    {d.referrers.slice(0, 6).map((r, idx) => {
                      const total = d.pageTypes.reduce((a, b) => a + b.views, 0) || 1
                      const pct = ((r.views / total) * 100).toFixed(0)
                      return (
                        <div key={'ref-' + idx} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-24 truncate shrink-0" title={r.referrer}>
                            {r.referrer}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-brand-primary/70 h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 w-8 text-right shrink-0">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <Link
              href="/admin/analytics"
              className="text-brand-primary text-sm font-medium hover:underline"
            >
              Ver analytics completo →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
