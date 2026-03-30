import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import translate from '@iamtraction/google-translate';

const parser = new Parser({
  customFields: { item: ['media:content', 'description'] },
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  },
});

type FeedTarget = { url: string; sourceName: string; lang?: string };

// ─── 모든 국가 / 토픽별 RSS 피드 테이블 ───────────────────────────────────────
const getFeedUrls = (country: string, topic: string): FeedTarget[] => {
  const urls: FeedTarget[] = [];
  const isAll = topic === 'ALL';

  // ── 공통 헬퍼 ──────────────────────────────────────────────────────────────
  const gNews = (qs: string, topicPath?: string) =>
    isAll
      ? `https://news.google.com/rss?${qs}`
      : topicPath
        ? `https://news.google.com/rss/headlines/section/topic/${topicPath}?${qs}`
        : `https://news.google.com/rss/search?q=${topic}&${qs}`;

  const gSearch = (q: string, qs: string) =>
    `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${qs}&num=30`;

  // ── 전체 뉴스 (GLOBAL_ALL) ─────────────────────────────────────────────────
  // ── 전체 뉴스 (GLOBAL_ALL) - 전세계 실시간 속보망 통합 ──────────────────────────────
  if (country === 'GLOBAL_ALL') {
    urls.push({ url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko', sourceName: 'Google News (KR)' });
    urls.push({ url: gSearch('site:naver.com OR site:daum.net 속보 최신', 'hl=ko&gl=KR&ceid=KR:ko'), sourceName: 'Naver/Daum 속보' });
    urls.push({ url: 'http://feeds.foxnews.com/foxnews/latest', sourceName: 'Fox News Latest', lang: 'en' });
    urls.push({ url: 'https://www.newsnow.co.uk/h/World+News?type=rss', sourceName: 'NewsNow Global', lang: 'en' });
    urls.push({ url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', sourceName: 'NYT', lang: 'en' });
    urls.push({ url: 'https://finance.yahoo.com/news/rss', sourceName: 'Yahoo Finance', lang: 'en' });
    urls.push({ url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', sourceName: 'CoinDesk', lang: 'en' });
    urls.push({ url: 'https://feeds.reuters.com/reuters/worldNews', sourceName: 'Reuters', lang: 'en' });
    urls.push({ url: 'https://www.mk.co.kr/rss/30000001/', sourceName: '매일경제' });
    return urls;
  }

  // ── 이란 (IR) ───────────────────────────────────────────────────────────────
  if (country === 'IR') {
    urls.push({ url: gSearch('Iran news war', 'hl=en-US&gl=US&ceid=US:en'), sourceName: 'Google News Iran', lang: 'en' });
    urls.push({ url: 'https://en.abna24.com/rss', sourceName: 'Abna24 (Iran)' });
    urls.push({ url: 'https://en.mehrnews.com/rss', sourceName: 'Mehr News' });
    urls.push({ url: gSearch('Iran sanctions nuclear Middle East', 'hl=en-US&gl=US&ceid=US:en'), sourceName: 'Iran Global', lang: 'en' });
    return urls;
  }

  // ── 이스라엘 (IL) ───────────────────────────────────────────────────────────
  if (country === 'IL') {
    urls.push({ url: gSearch('Israel Gaza war Hamas', 'hl=en-US&gl=US&ceid=US:en'), sourceName: 'Google News Israel', lang: 'en' });
    urls.push({ url: 'https://www.timesofisrael.com/feed/', sourceName: 'Times of Israel' });
    urls.push({ url: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx', sourceName: 'Jerusalem Post' });
    urls.push({ url: 'https://www.ynetnews.com/home/0,7340,L-3083,00.html', sourceName: 'Ynet News' });
    return urls;
  }

  // ── 전쟁/분쟁 (WAR) ─────────────────────────────────────────────────────────
  if (country === 'WAR') {
    const q = 'hl=en-US&gl=US&ceid=US:en';
    urls.push({ url: gSearch('war conflict military strike geopolitics', q), sourceName: 'Global War News', lang: 'en' });
    urls.push({ url: gSearch('Ukraine Russia war 2025', q), sourceName: 'Ukraine War', lang: 'en' });
    urls.push({ url: gSearch('Israel Gaza Palestine war', q), sourceName: 'Israel War', lang: 'en' });
    urls.push({ url: gSearch('Iran nuclear war', q), sourceName: 'Iran Conflict', lang: 'en' });
    urls.push({ url: gSearch('Taiwan China military', q), sourceName: 'Taiwan Strait', lang: 'en' });
    urls.push({ url: 'http://feeds.bbci.co.uk/news/world/rss.xml', sourceName: 'BBC World', lang: 'en' });
    return urls;
  }

  // ── 국가 로직 고도화: 언론사 직접 피드를 대거 추가하여 구글뉴스 의존도 낮추고 실시간성 향상 ──
  // ── 국내 (KR) ───────────────────────────────────────────────────────────────
  if (country === 'KR') {
    if (topic === 'AI' || topic === 'TECHNOLOGY') {
      urls.push({ url: 'https://www.aitimes.com/rss/all.xml', sourceName: 'AI타임즈' });
      urls.push({ url: 'https://www.zdnet.co.kr/rss/all.xml', sourceName: 'ZDNet Korea' });
      urls.push({ url: 'https://rss.donga.com/it.xml', sourceName: '동아일보 IT' });
      urls.push({ url: gSearch('인공지능 AI 딥러닝 기술', 'hl=ko&gl=KR&ceid=KR:ko'), sourceName: 'AI 뉴스' });
    } else if (topic === 'POLITICS') {
      urls.push({ url: 'https://v.daum.net/rss/news/politics', sourceName: '다음 정치' });
      urls.push({ url: 'https://www.yonhapnews.co.kr/rss/politics.xml', sourceName: '연합뉴스 정치' });
    } else if (topic === 'BUSINESS') {
      urls.push({ url: 'https://www.mk.co.kr/rss/30100041/', sourceName: '매경 경제' });
      urls.push({ url: 'https://rss.hankyung.com/economy.xml', sourceName: '한경 경제' });
    } else {
      urls.push({ url: gNews('hl=ko&gl=KR&ceid=KR:ko', topic === 'ALL' ? undefined : topic), sourceName: 'Google News KR' });
      urls.push({ url: gSearch(`site:naver.com OR site:daum.net ${topic === 'ALL' ? '속보' : topic}`, 'hl=ko&gl=KR&ceid=KR:ko'), sourceName: 'Naver/Daum News' });
    }
    
    if (isAll) {
      urls.push({ url: 'https://www.yonhapnewstv.co.kr/browse/feed/', sourceName: '연합뉴스TV' });
      urls.push({ url: 'https://v.daum.net/rss/news/all', sourceName: '다음 속보' });
      urls.push({ url: 'https://rss.kbs.co.kr/v1/newsrv/latest/news.rss', sourceName: 'KBS 뉴스' });
    }
    return urls;
  }

  // ── 미국 (US) - 중복 문제 해결 및 직접 언론사 연동 ───────────────────────────
  if (country === 'US') {
    urls.push({ url: gNews('hl=en-US&gl=US&ceid=US:en', !isAll ? topic : undefined), sourceName: 'Google News US', lang: 'en' });
    urls.push({ url: 'https://www.newsnow.co.uk/h/World+News/North+America/USA?type=rss', sourceName: 'NewsNow US', lang: 'en' });
    
    if (isAll || topic === 'POLITICS') {
      urls.push({ url: 'http://feeds.foxnews.com/foxnews/latest', sourceName: 'Fox News', lang: 'en' });
      urls.push({ url: 'https://www.newsnow.co.uk/h/World+News/North+America/USA/Politics?type=rss', sourceName: 'NewsNow US Politics', lang: 'en' });
    }
    if (isAll || topic === 'WORLD') urls.push({ url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', sourceName: 'NYT', lang: 'en' });
    if (isAll || topic === 'BUSINESS') {
      urls.push({ url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?id=10000664', sourceName: 'CNBC Finance', lang: 'en' });
      urls.push({ url: 'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml', sourceName: 'WSJ Business', lang: 'en' });
      urls.push({ url: 'https://www.newsnow.co.uk/h/Business+&+Finance?type=rss', sourceName: 'NewsNow Business', lang: 'en' });
    }
    urls.push({ url: 'http://rss.cnn.com/rss/edition_us.rss', sourceName: 'CNN US', lang: 'en' });
    return urls;
  }

  // ── 중국 (CN) ─────────────────────────────────────────────────────────────
  if (country === 'CN') {
    urls.push({ url: 'http://www.xinhuanet.com/english/rss/world.xml', sourceName: 'Xinhua World', lang: 'en' });
    urls.push({ url: 'https://www.scmp.com/rss/91/feed', sourceName: 'SCMP (HK/China)', lang: 'en' });
    urls.push({ url: gNews('hl=zh-CN&gl=CN&ceid=CN:zh-Hans', !isAll ? topic : undefined), sourceName: 'Google News CN' });
    return urls;
  }

  // ── 일본 (JP) ─────────────────────────────────────────────────────────────
  if (country === 'JP') {
    urls.push({ url: 'https://www.nhk.or.jp/rss/news/cat0.xml', sourceName: 'NHK News' });
    urls.push({ url: 'https://www.japantimes.co.jp/feed/', sourceName: 'Japan Times', lang: 'en' });
    urls.push({ url: gNews('hl=ja&gl=JP&ceid=JP:ja', !isAll ? topic : undefined), sourceName: 'Google News JP' });
    return urls;
  }

  // ── 유럽 (EU) ─────────────────────────────────────────────────────────────
  if (country === 'EU') {
    urls.push({ url: 'https://rss.dw.com/rdf/rss-en-eu', sourceName: 'DW (Germany)', lang: 'en' });
    urls.push({ url: 'https://www.france24.com/en/rss', sourceName: 'France 24', lang: 'en' });
    urls.push({ url: gNews('hl=en-GB&gl=GB&ceid=GB:en', !isAll ? topic : undefined), sourceName: 'Google News EU', lang: 'en' });
    return urls;
  }

  // ── 러시아 (RU) ─────────────────────────────────────────────────────────────
  if (country === 'RU') {
    urls.push({ url: 'https://tass.com/rss/v2.xml', sourceName: 'TASS', lang: 'en' });
    urls.push({ url: 'https://themoscowtimes.com/rss/news', sourceName: 'Moscow Times', lang: 'en' });
    urls.push({ url: gSearch('Russia Ukraine war economy 2025', 'hl=en-US&gl=US&ceid=US:en'), sourceName: 'Russia News', lang: 'en' });
    return urls;
  }

  // ── 코인 (CRYPTO) ───────────────────────────────────────────────────────────
  if (country === 'CRYPTO') {
    urls.push({ url: 'https://kr.coinness.com/news/rss', sourceName: '코인니스' });
    urls.push({ url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', sourceName: 'CoinDesk', lang: 'en' });
    urls.push({ url: 'https://cointelegraph.com/rss', sourceName: 'Cointelegraph', lang: 'en' });
    urls.push({ url: 'https://decrypt.co/feed', sourceName: 'Decrypt', lang: 'en' });
    urls.push({ url: gSearch('Bitcoin Ethereum crypto XRP Solana', 'hl=en-US&gl=US&ceid=US:en'), sourceName: 'Global Crypto', lang: 'en' });
    return urls;
  }

  // ── 기타 국가 (TW, FR, WORLD) ──────────────────────────────
  const langMap: Record<string, string> = {
    'WORLD': 'hl=en-US&gl=US&ceid=US:en',
    'TW': 'hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    'FR': 'hl=fr&gl=FR&ceid=FR:fr',
  };
  const q = langMap[country] || 'hl=en-US&gl=US&ceid=US:en';
  urls.push({ url: gNews(q, !isAll ? topic : undefined), sourceName: `Google News ${country}` });

  if (country === 'WORLD') {
    if (isAll || topic === 'WORLD') {
      urls.push({ url: 'http://feeds.bbci.co.uk/news/world/rss.xml', sourceName: 'BBC News', lang: 'en' });
      urls.push({ url: 'http://rss.cnn.com/rss/edition_world.rss', sourceName: 'CNN', lang: 'en' });
      urls.push({ url: 'https://feeds.reuters.com/reuters/worldNews', sourceName: 'Reuters', lang: 'en' });
    }
  }

  return urls;
};

// ─── Cache ─────────────────────────────────────────────────────────────────────
const newsCache = new Map<string, { items: any[], total: number, totalPages: number, ts: number }>();
const CACHE_TTL = 20000; // 20 seconds for ultra-fast refresh

export const revalidate = 0;

// ─── Thumbnail extraction ──────────────────────────────────────────────────────
const extractThumb = (item: any): string | null => {
  if (item['media:content']?.['$']?.url) return item['media:content']['$'].url;
  const m = (item.content || item.contentSnippet || item.description || '').match(/<img[^>]+src="([^">]+)"/i);
  return m ? m[1] : null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'KR';
  const topic = searchParams.get('topic') || 'ALL';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = 12;
  const cacheKey = `${category}-${topic}-${page}`;
  const now = Date.now();

  // ── Cache hit ────────────────────────────────────────────────────────────────
  const cached = newsCache.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL) {
    return NextResponse.json({
      items: cached.items,
      total: cached.total,
      page,
      totalPages: cached.totalPages,
      cached: true
    }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
  }

  try {
    const feedTargets = getFeedUrls(category, topic);

    // ── Fetch all feeds in parallel with individual timeouts ──────────────────
    const fetchWithTimeout = async (target: FeedTarget) => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 4500); // 7초에서 4.5초로 줄여 실시간 응답성 향상
        try {
          const feed = await parser.parseURL(target.url);
          clearTimeout(t);
          return feed.items.map(item => ({
            id: item.guid || item.link || `${target.sourceName}-${Math.random()}`,
            title: (item.title || '').trim(),
            link: item.link || '',
            pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
            contentSnippet: item.contentSnippet || item.content || '',
            source: target.sourceName,
            thumbnail: extractThumb(item),
            lang: target.lang || 'ko'
          }));
        } finally {
          clearTimeout(t);
        }
      } catch {
        return [];
      }
    };

    const results = await Promise.allSettled(feedTargets.map(fetchWithTimeout));
    let all: any[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') all = all.concat(r.value);
    }

    // ── Deduplicate by title similarity ──────────────────────────────────────
    const seen = new Set<string>();
    all = all.filter(item => {
      const key = item.title.slice(0, 40).toLowerCase().replace(/[^a-zA-Z0-9ㄱ-힣]/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // ── Chronological sort ────────────────────────────────────────────────────
    all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    const total = all.length;
    const start = (page - 1) * pageSize;
    let pageItems = all.slice(start, start + pageSize);

    // ── Translate foreign news ────────────────────────────────────────────────
    const isForeign = !['KR'].includes(category);
    if (isForeign && pageItems.length > 0) {
      pageItems = await Promise.all(pageItems.map(async item => {
        try {
          const translated = await translate(item.title, { to: 'ko' });
          return { ...item, title: translated.text, originalTitle: item.title };
        } catch {
          return item;
        }
      }));
    }

    // ── Cache and respond ─────────────────────────────────────────────────────
    newsCache.set(cacheKey, { items: pageItems, total, totalPages: Math.ceil(total / pageSize), ts: now });

    return NextResponse.json({
      items: pageItems,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
      sources: feedTargets.map(f => f.sourceName)
    }, { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40' } });

  } catch (error) {
    console.error('News API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch news', items: [] }, { status: 500 });
  }
}
