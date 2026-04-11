import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { newsId, message, context } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 실제 환경에서는 여기서 LLM(GPT-4, Claude 등)에 뉴스 컨텍스트와 함께 질문을 던집니다.
    // 여기서는 터미널의 톤앤매너에 맞는 인텔리전트한 가짜 응답을 생성합니다.

    const responses = [
      `해당 뉴스는 단기적으로 ${context?.assets?.[0] || '관련 자산'}의 유동성에 큰 영향을 줄 것으로 보입니다. 특히 오더플로우상에서 매도 압력이 포착되고 있어 주의가 필요합니다.`,
      `과거사례(2023년 3월)와 유사한 패턴을 보이고 있습니다. 당시에도 유사한 보도 직후 나스닥 선물이 약 2% 가량 조정을 받은 적이 있으니, 기술적 지지선을 확인하세요.`,
      `이 지표는 거시 경제 정책의 전환점(Pivot)을 암시할 수 있습니다. 특히 채권 수익률 곡선(Yield Curve)의 변화와 함께 관찰하는 것이 중요합니다.`,
      `질문하신 부분은 시장의 컨센서스와는 조금 다른 시각입니다. AI 분석 결과, 이번 보도는 실제 펀더멘탈보다는 심리적 'FUD'에 의한 일시적 영향일 가능성이 65%입니다.`
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    // 지연 시뮬레이션 (생각하는 척)
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({
      answer: randomResponse,
      timestamp: new Date().toISOString(),
      confidence: 0.92,
      relatedAssets: context?.assets || ['USD', 'BTC']
    });

  } catch (error) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: 'Failed to analyze news' }, { status: 500 });
  }
}
