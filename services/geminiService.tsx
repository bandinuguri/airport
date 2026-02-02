
import { GoogleGenAI } from "@google/genai";
import { Airport, AirportWeather } from "../types";

const extractJson = (text: string) => {
  if (!text) return "";
  try {
    const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();
    const firstOpenBrace = text.indexOf('{');
    const lastCloseBrace = text.lastIndexOf('}');
    if (firstOpenBrace !== -1 && lastCloseBrace !== -1 && lastCloseBrace > firstOpenBrace) {
      return text.substring(firstOpenBrace, lastCloseBrace + 1);
    }
    return text;
  } catch (e) {
    return text;
  }
};

export const fetchAllAirportsData = async (ai: any, airports: Airport[], kstNow: string): Promise<{ data: AirportWeather[], sources: { title: string; uri: string }[] }> => {
  const mappingInstructions = airports.map(a => `- ${a.name}(${a.icao}): 기상청 특보구역 [${a.kmaRegion}]`).join('\n');

  const prompt = `
    당신은 대한민국 기상청(KMA) 및 항공기상청(AMO) 데이터를 대조 분석하는 '항공기상 정밀 분석관'이다.
    현재 시각(KST): ${kstNow}

    [필독: 특보 분석 지침]
    1. 검색 도구를 사용하여 '기상청 기상특보 현황' 페이지(https://www.weather.go.kr/w/special-report/overall.do)를 실시간 분석하라.
    2. 각 공항별 매핑된 [특보구역]에서 **현재 "발효 중"인** 특보만 추출하라.
    3. **대설(Heavy Snow)** 관련: 
       - '대설주의보' 또는 '대설경보'가 발효 중인지 해당 구역(예: 인천, 서울, 제주도북부 등)을 반드시 확인하라.
       - 대설 특보가 있다면 'advisories'에 포함시키고, 실시간 적설량(cm)을 'snowfall'에 기재하라.
    4. **허위 정보(Hallucination) 방지**:
       - '예비 특보'나 '해제 정보'는 절대 포함하지 마라.
       - 현재 유효한 특보가 하나도 없다면 반드시 "없음"으로 기재하라.
       - "확인됨", "발효중" 같은 부가 설명 없이 특보 명칭만 단답형으로 적어라.
    5. 'matchingLogic'에는 반드시 "특보 분석 기준 시각"을 명시하라.

    [대상 리스트]
    ${mappingInstructions}

    [JSON 응답 형식]
    {
      "data": [
        {
          "airportName": "공항명(이름만)",
          "icao": "ICAO",
          "current": { "condition": "날씨", "temperature": "0°C", "iconCode": "sunny|cloudy|rain|snow|mist|wind|thunderstorm" },
          "forecast12h": [ {"time": "4h", "iconCode": "코드"}, {"time": "8h", "iconCode": "코드"}, {"time": "12h", "iconCode": "코드"} ],
          "advisories": "특보명1, 특보명2 (없으면 '없음')",
          "snowfall": "적설량(cm) 또는 '-'",
          "kmaTargetRegion": "특보구역명",
          "matchingLogic": "데이터 수집 시각 및 근거"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0, 
      },
    });

    if (!response || !response.text) throw new Error("API 응답 없음");

    const cleanedJson = extractJson(response.text);
    const parsed = JSON.parse(cleanedJson);
    
    if (parsed.data && Array.isArray(parsed.data)) {
      const sanitizedData = parsed.data.map((item: any) => ({
        ...item,
        airportName: String(item.airportName).replace(/공항$/, ''),
        advisories: String(item.advisories || "없음")
          .split(/[,/]/)
          .map(s => s.trim())
          .filter(s => s && !s.includes("해제") && !s.includes("예비") && !s.includes("발효"))
          .join(", ") || "없음"
      }));
      return { data: sanitizedData, sources: [] };
    }
    
    throw new Error("데이터 구조 오류");
  } catch (err) {
    console.error("Gemini Data Fetch Error:", err);
    throw err;
  }
};
