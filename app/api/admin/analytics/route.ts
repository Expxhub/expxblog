import { NextRequest, NextResponse } from 'next/server'
import { client } from '@/drizzle/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '365d': 365,
    }
    const days = daysMap[period] ?? 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString()

    const [
      totalViews,
      uniqueVisitors,
      prevTotalViews,
      prevUniqueVisitors,
      topPosts,
      viewsByDay,
      viewsByHour,
      viewsByWeekday,
      referrers,
      pageTypes,
      todayViews,
      yesterdayViews,
      onlineNow,
    ] = await Promise.all([
      client`SELECT count(*)::int as count FROM page_views WHERE visited_at >= ${since}::timestamp`,
      client`SELECT count(distinct ip)::int as count FROM page_views WHERE visited_at >= ${since}::timestamp`,
      client`SELECT count(*)::int as count FROM page_views WHERE visited_at >= ${prevSince}::timestamp AND visited_at < ${since}::timestamp`,
      client`SELECT count(distinct ip)::int as count FROM page_views WHERE visited_at >= ${prevSince}::timestamp AND visited_at < ${since}::timestamp`,
      client`SELECT post_id, post_slug, post_title, count(*)::int as views FROM page_views WHERE visited_at >= ${since}::timestamp AND post_id IS NOT NULL GROUP BY post_id, post_slug, post_title ORDER BY count(*) DESC LIMIT 10`,
      client`SELECT date(visited_at)::text as date, count(*)::int as views, count(distinct ip)::int as unique FROM page_views WHERE visited_at >= ${since}::timestamp GROUP BY date(visited_at) ORDER BY date(visited_at) ASC`,
      client`SELECT extract(hour from visited_at)::int as hour, count(*)::int as views FROM page_views WHERE visited_at >= ${since}::timestamp GROUP BY extract(hour from visited_at) ORDER BY extract(hour from visited_at) ASC`,
      client`SELECT extract(dow from visited_at)::int as weekday, count(*)::int as views FROM page_views WHERE visited_at >= ${since}::timestamp GROUP BY extract(dow from visited_at) ORDER BY extract(dow from visited_at) ASC`,
      client`SELECT case when referrer IS NULL OR referrer = '' then 'Direto' else split_part(referrer, '//', 2) end as referrer, count(*)::int as views FROM page_views WHERE visited_at >= ${since}::timestamp GROUP BY case when referrer IS NULL OR referrer = '' then 'Direto' else split_part(referrer, '//', 2) end ORDER BY count(*) DESC LIMIT 10`,
      client`SELECT case when path = '/' then 'Home' when post_id IS NOT NULL then 'Artigo' when path like '/categoria/%' then 'Categoria' when path like '/tag/%' then 'Tag' when path like '/busca%' then 'Busca' else 'Outro' end as type, count(*)::int as views FROM page_views WHERE visited_at >= ${since}::timestamp GROUP BY case when path = '/' then 'Home' when post_id IS NOT NULL then 'Artigo' when path like '/categoria/%' then 'Categoria' when path like '/tag/%' then 'Tag' when path like '/busca%' then 'Busca' else 'Outro' end ORDER BY count(*) DESC`,
      client`SELECT count(*)::int as count FROM page_views WHERE visited_at >= current_date`,
      client`SELECT count(*)::int as count FROM page_views WHERE visited_at >= current_date - interval '1 day' AND visited_at < current_date`,
      client`SELECT count(*)::int as count FROM page_views WHERE visited_at >= now() - interval '5 minutes'`,
    ])

    const weekdays = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']
    const viewsByWeekdayLabeled = viewsByWeekday.map((row: any) => ({
      weekday: weekdays[row.weekday] || ('Dia ' + row.weekday),
      weekdayIndex: row.weekday,
      views: row.views,
    }))

    const hoursArray = Array.from({ length: 24 }, (_, i) => {
      const found = viewsByHour.find((r: any) => r.hour === i)
      const h = String(i).padStart(2, '0')
      return { hour: i, label: h + ':00', views: found?.views || 0 }
    })

    const referrerCleaned = referrers.map((r: any) => ({
      referrer: r.referrer.split('/')[0] || r.referrer,
      views: r.views,
    }))

    return NextResponse.json({
      period,
      days,
      totalViews: totalViews[0]?.count || 0,
      uniqueVisitors: uniqueVisitors[0]?.count || 0,
      prevTotalViews: prevTotalViews[0]?.count || 0,
      prevUniqueVisitors: prevUniqueVisitors[0]?.count || 0,
      topPosts,
      viewsByDay,
      viewsByHour: hoursArray,
      viewsByWeekday: viewsByWeekdayLabeled,
      referrers: referrerCleaned,
      pageTypes,
      todayViews: todayViews[0]?.count || 0,
      yesterdayViews: yesterdayViews[0]?.count || 0,
      onlineNow: onlineNow[0]?.count || 0,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
