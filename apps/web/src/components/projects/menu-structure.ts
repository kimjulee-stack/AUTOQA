// 메뉴 구조 및 버튼 xpath 관리 타입 정의

export interface ButtonXpath {
  id: string;
  buttonName: string;
  xpath: string;
  no?: number; // 번호
  locatorType?: string; // 로케이터 타입 (xpath, id, class name 등)
  sleep?: number; // 대기 시간
  mandatory?: boolean; // 필수
  skipOnError?: boolean; // 에러시 건너뛰기
  // 조건부 점프
  jumpIfVisibleType?: string; // jump_if_visible_type
  jumpIfVisible?: string; // jump_if_visible
  jumpToNo?: number; // jump_to_no
  // 표시 조건
  visibleIfType?: string; // visible_if_type
  visibleIf?: string; // visible_if
}

export interface MenuItem {
  id: string;
  label: string;
  buttons?: ButtonXpath[]; // 메인만 버튼 목록을 가짐
}

// 앱별 메뉴 구조 정의
export function getMenusForApp(product?: string, subCategory?: string): MenuItem[] {
  // 뇌새김 + 프랑스어
  if (product === "뇌새김" && subCategory === "프랑스어") {
    return [
      { id: "main", label: "메인" },
      { id: "curriculum", label: "커리큘럼 리스트" },
      { id: "intro", label: "입문" },
      { id: "theme", label: "테마" },
      { id: "local_talk", label: "현지톡" },
      { id: "learning_report", label: "학습 리포트" },
      { id: "speaking_clinic", label: "스피킹 클리닉" },
      { id: "profile", label: "프로필" },
      { id: "settings", label: "설정" }
    ];
  }
  
  // 브레인키 + 실전한국어
  if (product === "브레인키" && subCategory === "실전한국어") {
    return [
      { id: "theme", label: "테마" },
      { id: "review", label: "리뷰" },
      { id: "audio_learning", label: "오디오학습" },
      { id: "learning_report", label: "학습리포트" },
      { id: "speaking_clinic", label: "스피킹클리닉" },
      { id: "profile", label: "프로필" },
      { id: "settings", label: "설정" }
    ];
  }
  
  // 기본 메뉴 (다른 경우)
  return [
    { id: "main", label: "메인" },
    { id: "curriculum", label: "커리큘럼 리스트" },
    { id: "intro", label: "입문" },
    { id: "theme", label: "테마" },
    { id: "local_talk", label: "현지톡" },
    { id: "learning_report", label: "학습 리포트" },
    { id: "speaking_clinic", label: "스피킹 클리닉" },
    { id: "profile", label: "프로필" },
    { id: "settings", label: "설정" }
  ];
}

// 레거시 호환성을 위한 기본 메뉴
export const topLevelMenus: MenuItem[] = [
  { id: "main", label: "메인" },
  { id: "curriculum", label: "커리큘럼 리스트" },
  { id: "intro", label: "입문" },
  { id: "theme", label: "테마" },
  { id: "local_talk", label: "현지톡" },
  { id: "learning_report", label: "학습 리포트" },
  { id: "speaking_clinic", label: "스피킹 클리닉" },
  { id: "profile", label: "프로필" },
  { id: "settings", label: "설정" }
];

export const mainMenuButtons: Omit<ButtonXpath, "id">[] = [
  { buttonName: "프로필 버튼", xpath: "" },
  { buttonName: "설정 버튼", xpath: "" },
  { buttonName: "바로 학습하기 버튼", xpath: "" },
  { buttonName: "현지톡 버튼", xpath: "" },
  { buttonName: "학습 리포트 버튼", xpath: "" },
  { buttonName: "스피킹 클리닉 버튼", xpath: "" }
];

