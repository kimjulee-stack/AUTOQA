// 제품별 카드 라이브러리 정의

export interface CardItem {
  type: string;
  label: string;
  category: string;
}

export interface CardCategory {
  id: string;
  label: string;
}

// 맥스AI 전용 카드 라이브러리
export const maxaiCardCategories: CardCategory[] = [];

export const maxaiCardLibrary: CardItem[] = [
  { type: "click", label: "클릭", category: "" },
  { type: "input", label: "입력", category: "" },
  { type: "delete", label: "삭제", category: "" },
  { type: "wait", label: "대기", category: "" },
  { type: "scroll", label: "스크롤", category: "" },
  { type: "swipe", label: "스와이프", category: "" },
  { type: "audio", label: "오디오 송출", category: "" }
];

// 제품별 카드 라이브러리 맵
export const productCardLibraries: Record<string, { categories: CardCategory[]; cards: CardItem[] }> = {
  맥스AI: {
    categories: maxaiCardCategories,
    cards: maxaiCardLibrary
  }
  // 다른 제품들은 나중에 추가
};

// 기본 카드 라이브러리 (제품이 지정되지 않았거나 지원되지 않는 경우)
export const defaultCardCategories: CardCategory[] = [];

export const defaultCardLibrary: CardItem[] = [
  { type: "click", label: "클릭", category: "" },
  { type: "input", label: "입력", category: "" },
  { type: "delete", label: "삭제", category: "" },
  { type: "wait", label: "대기", category: "" },
  { type: "swipe", label: "스와이프", category: "" },
  { type: "audio", label: "오디오 송출", category: "" }
];

// 제품에 맞는 카드 라이브러리 가져오기
export function getCardLibraryForProduct(product?: string): { categories: CardCategory[]; cards: CardItem[] } {
  if (!product) {
    return { categories: defaultCardCategories, cards: defaultCardLibrary };
  }
  return productCardLibraries[product] || { categories: defaultCardCategories, cards: defaultCardLibrary };
}

