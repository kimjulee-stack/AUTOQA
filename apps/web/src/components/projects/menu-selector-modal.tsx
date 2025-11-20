"use client";

import { useState, useEffect, useMemo } from "react";
import { getMenusForApp, mainMenuButtons, type ButtonXpath } from "./menu-structure";

interface MenuSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (menuId: string, buttonXpaths?: ButtonXpath[]) => void;
  initialMenuId?: string;
  initialButtonXpaths?: ButtonXpath[];
  product?: string;
  subCategory?: string;
}

const locatorTypes = [
  { value: "xpath", label: "XPath" },
  { value: "id", label: "ID" },
  { value: "class name", label: "Class Name" },
  { value: "accessibility id", label: "Accessibility ID" },
  { value: "text", label: "Text" }
];

export function MenuSelectorModal({
  open,
  onClose,
  onSelect,
  initialMenuId,
  initialButtonXpaths,
  product,
  subCategory
}: MenuSelectorModalProps) {
  const [selectedMenuId, setSelectedMenuId] = useState<string>(initialMenuId || "");
  const [buttonXpaths, setButtonXpaths] = useState<ButtonXpath[]>(
    initialButtonXpaths || mainMenuButtons.map((btn, idx) => ({ 
      id: `btn-${idx}`, 
      ...btn,
      no: idx + 1,
      locatorType: "xpath",
      sleep: 2,
      mandatory: false,
      skipOnError: false
    }))
  );
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
  const [tempButtonData, setTempButtonData] = useState<Partial<ButtonXpath>>({});
  const [expandedJumpSections, setExpandedJumpSections] = useState<Set<string>>(new Set());
  const [expandedVisibleSections, setExpandedVisibleSections] = useState<Set<string>>(new Set());

  // 앱별 메뉴 가져오기
  const availableMenus = useMemo(() => {
    return getMenusForApp(product, subCategory);
  }, [product, subCategory]);

  useEffect(() => {
    if (open) {
      setSelectedMenuId(initialMenuId || "");
      setButtonXpaths(
        initialButtonXpaths || mainMenuButtons.map((btn, idx) => ({ 
          id: `btn-${idx}`, 
          ...btn,
          no: idx + 1,
          locatorType: "xpath",
          sleep: 2,
          mandatory: false,
          skipOnError: false
        }))
      );
    }
  }, [open, initialMenuId, initialButtonXpaths]);

  const handleMenuSelect = (menuId: string) => {
    setSelectedMenuId(menuId);
    // 모든 메뉴에서 버튼 목록 초기화 (기본값은 빈 배열)
    setButtonXpaths([]);
  };

  const handleButtonXpathChange = (buttonId: string, xpath: string) => {
    setButtonXpaths(prev =>
      prev.map(btn => (btn.id === buttonId ? { ...btn, xpath } : btn))
    );
  };

  const handleStartEdit = (buttonId: string) => {
    const button = buttonXpaths.find(b => b.id === buttonId);
    setEditingButtonId(buttonId);
    setTempButtonData({
      buttonName: button?.buttonName || "",
      xpath: button?.xpath || "",
      no: button?.no || buttonXpaths.length + 1,
      locatorType: button?.locatorType || "xpath",
      sleep: button?.sleep || 2,
      mandatory: button?.mandatory || false,
      skipOnError: button?.skipOnError || false,
      jumpIfVisibleType: button?.jumpIfVisibleType || "",
      jumpIfVisible: button?.jumpIfVisible || "",
      jumpToNo: button?.jumpToNo,
      visibleIfType: button?.visibleIfType || "",
      visibleIf: button?.visibleIf || ""
    });
  };

  const handleSaveEdit = (buttonId: string) => {
    setButtonXpaths(prev =>
      prev.map(btn => 
        btn.id === buttonId 
          ? { ...btn, ...tempButtonData }
          : btn
      )
    );
    setEditingButtonId(null);
    setTempButtonData({});
  };

  const handleCancelEdit = () => {
    setEditingButtonId(null);
    setTempButtonData({});
  };

  const handleDeleteButton = (buttonId: string) => {
    if (confirm("이 버튼을 삭제하시겠습니까?")) {
      setButtonXpaths(prev => prev.filter(btn => btn.id !== buttonId));
    }
  };

  const handleAddButton = () => {
    const newButton: ButtonXpath = {
      id: `btn-${Date.now()}`,
      buttonName: "새 버튼",
      xpath: "",
      no: buttonXpaths.length + 1,
      locatorType: "xpath",
      sleep: 2,
      mandatory: false,
      skipOnError: false
    };
    setButtonXpaths(prev => [...prev, newButton]);
    setEditingButtonId(newButton.id);
    setTempButtonData({
      buttonName: "새 버튼",
      xpath: "",
      no: buttonXpaths.length + 1,
      locatorType: "xpath",
      sleep: 2,
      mandatory: false,
      skipOnError: false
    });
  };

  const handleConfirm = () => {
    if (!selectedMenuId) {
      alert("메뉴를 선택해주세요.");
      return;
    }
    // 모든 메뉴에서 버튼 목록 전달
    onSelect(selectedMenuId, buttonXpaths.length > 0 ? buttonXpaths : undefined);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 30
      }}
      onClick={onClose}
    >
      <div
        className="surface"
        style={{
          width: 600,
          maxHeight: "80vh",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflowY: "auto"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 20, fontWeight: 700 }}>메뉴 및 버튼 선택</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              cursor: "pointer",
              color: "var(--text-muted)"
            }}
          >
            ✕
          </button>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
            메뉴 선택
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {availableMenus.map(menu => (
              <button
                key={menu.id}
                type="button"
                onClick={() => handleMenuSelect(menu.id)}
                style={{
                  padding: "10px 12px",
                  border: `2px solid ${selectedMenuId === menu.id ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: 8,
                  background: selectedMenuId === menu.id ? "var(--primary-light)" : "#fff",
                  cursor: "pointer",
                  fontWeight: selectedMenuId === menu.id ? 600 : 500,
                  fontSize: 13
                }}
              >
                {menu.label}
              </button>
            ))}
          </div>
        </div>

        {selectedMenuId && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 600 }}>
                {availableMenus.find(m => m.id === selectedMenuId)?.label} 버튼 설정
              </label>
              <button
                type="button"
                onClick={handleAddButton}
                style={{
                  padding: "6px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                + 버튼 추가
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {buttonXpaths.map(button => (
                <div
                  key={button.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 13 }}>{button.buttonName}</strong>
                    <div style={{ display: "flex", gap: 4 }}>
                      {editingButtonId === button.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(button.id)}
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              border: "1px solid var(--primary)",
                              borderRadius: 4,
                              background: "var(--primary)",
                              color: "#fff",
                              cursor: "pointer"
                            }}
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              background: "#fff",
                              cursor: "pointer"
                            }}
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(button.id)}
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              background: "#fff",
                              cursor: "pointer"
                            }}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteButton(button.id)}
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              border: "1px solid var(--danger)",
                              borderRadius: 4,
                              background: "#fff",
                              color: "var(--danger)",
                              cursor: "pointer"
                            }}
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {editingButtonId === button.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                            번호
                          </label>
                          <input
                            type="number"
                            value={tempButtonData.no || ""}
                            onChange={e => setTempButtonData(prev => ({ ...prev, no: Number(e.target.value) }))}
                            placeholder="번호"
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              fontSize: 12
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                            대기 시간 (초)
                          </label>
                          <input
                            type="number"
                            value={tempButtonData.sleep || ""}
                            onChange={e => setTempButtonData(prev => ({ ...prev, sleep: Number(e.target.value) }))}
                            placeholder="대기 시간"
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              fontSize: 12
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                          이름
                        </label>
                        <input
                          type="text"
                          value={tempButtonData.buttonName || ""}
                          onChange={e => setTempButtonData(prev => ({ ...prev, buttonName: e.target.value }))}
                          placeholder="버튼 이름"
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            fontSize: 12
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                          로케이터 타입
                        </label>
                        <select
                          value={tempButtonData.locatorType || "xpath"}
                          onChange={e => setTempButtonData(prev => ({ ...prev, locatorType: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            fontSize: 12
                          }}
                        >
                          {locatorTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                          로케이터 (XPath 등)
                        </label>
                        <textarea
                          value={tempButtonData.xpath || ""}
                          onChange={e => setTempButtonData(prev => ({ ...prev, xpath: e.target.value }))}
                          placeholder="XPath를 입력하세요"
                          style={{
                            width: "100%",
                            minHeight: 60,
                            padding: "8px",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            fontSize: 12,
                            fontFamily: "monospace"
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                          <input
                            type="checkbox"
                            checked={tempButtonData.mandatory || false}
                            onChange={e => setTempButtonData(prev => ({ ...prev, mandatory: e.target.checked }))}
                            style={{ cursor: "pointer" }}
                          />
                          필수
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                          <input
                            type="checkbox"
                            checked={tempButtonData.skipOnError || false}
                            onChange={e => setTempButtonData(prev => ({ ...prev, skipOnError: e.target.checked }))}
                            style={{ cursor: "pointer" }}
                          />
                          에러시 건너뛰기
                        </label>
                      </div>
                      
                      {/* 조건부 점프 섹션 */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                        <div
                          onClick={() => {
                            const newExpanded = new Set(expandedJumpSections);
                            if (newExpanded.has(button.id)) {
                              newExpanded.delete(button.id);
                            } else {
                              newExpanded.add(button.id);
                            }
                            setExpandedJumpSections(newExpanded);
                          }}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            userSelect: "none",
                            marginBottom: 8
                          }}
                        >
                          <span>{expandedJumpSections.has(button.id) ? "▼" : "▶"}</span>
                          <span>조건부 점프</span>
                        </div>
                        {expandedJumpSections.has(button.id) && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                                jump_if_visible_type
                              </label>
                              <select
                                value={tempButtonData.jumpIfVisibleType || ""}
                                onChange={e => setTempButtonData(prev => ({ ...prev, jumpIfVisibleType: e.target.value }))}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  border: "1px solid var(--border)",
                                  borderRadius: 6,
                                  fontSize: 12
                                }}
                              >
                                <option value="">선택</option>
                                {locatorTypes.map(type => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                                jump_if_visible
                              </label>
                              <input
                                type="text"
                                value={tempButtonData.jumpIfVisible || ""}
                                onChange={e => setTempButtonData(prev => ({ ...prev, jumpIfVisible: e.target.value }))}
                                placeholder="조건 locator"
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  border: "1px solid var(--border)",
                                  borderRadius: 6,
                                  fontSize: 12
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                                jump_to_no
                              </label>
                              <input
                                type="number"
                                value={tempButtonData.jumpToNo || ""}
                                onChange={e => setTempButtonData(prev => ({ ...prev, jumpToNo: e.target.value ? Number(e.target.value) : undefined }))}
                                placeholder="점프할 스텝 번호"
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  border: "1px solid var(--border)",
                                  borderRadius: 6,
                                  fontSize: 12
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* 표시 조건 섹션 */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                        <div
                          onClick={() => {
                            const newExpanded = new Set(expandedVisibleSections);
                            if (newExpanded.has(button.id)) {
                              newExpanded.delete(button.id);
                            } else {
                              newExpanded.add(button.id);
                            }
                            setExpandedVisibleSections(newExpanded);
                          }}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            userSelect: "none",
                            marginBottom: 8
                          }}
                        >
                          <span>{expandedVisibleSections.has(button.id) ? "▼" : "▶"}</span>
                          <span>표시 조건</span>
                        </div>
                        {expandedVisibleSections.has(button.id) && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                                visible_if_type
                              </label>
                              <select
                                value={tempButtonData.visibleIfType || ""}
                                onChange={e => setTempButtonData(prev => ({ ...prev, visibleIfType: e.target.value }))}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  border: "1px solid var(--border)",
                                  borderRadius: 6,
                                  fontSize: 12
                                }}
                              >
                                <option value="">선택</option>
                                {locatorTypes.map(type => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                                visible_if
                              </label>
                              <input
                                type="text"
                                value={tempButtonData.visibleIf || ""}
                                onChange={e => setTempButtonData(prev => ({ ...prev, visibleIf: e.target.value }))}
                                placeholder="조건 locator"
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  border: "1px solid var(--border)",
                                  borderRadius: 6,
                                  fontSize: 12
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11 }}>
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>번호:</span>{" "}
                          <strong>{button.no ?? "-"}</strong>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>로케이터 타입:</span>{" "}
                          <strong>{button.locatorType || "xpath"}</strong>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>대기:</span>{" "}
                          <strong>{button.sleep ?? 2}초</strong>
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "8px",
                          background: "#f6f7fb",
                          borderRadius: 6,
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: button.xpath ? "var(--text-strong)" : "var(--text-muted)",
                          minHeight: 40,
                          wordBreak: "break-all"
                        }}
                      >
                        {button.xpath || "XPath가 설정되지 않았습니다."}
                      </div>
                      <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                        {button.mandatory && (
                          <span style={{ padding: "2px 6px", background: "#dcfce7", borderRadius: 4, color: "#166534" }}>
                            필수
                          </span>
                        )}
                        {button.skipOnError && (
                          <span style={{ padding: "2px 6px", background: "#fef3c7", borderRadius: 4, color: "#92400e" }}>
                            에러시 건너뛰기
                          </span>
                        )}
                      </div>
                      {(button.jumpIfVisibleType || button.jumpIfVisible || button.jumpToNo) && (
                        <div style={{ marginTop: 8, padding: "8px", background: "#f0f9ff", borderRadius: 6, fontSize: 11 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>조건부 점프:</div>
                          {button.jumpIfVisibleType && (
                            <div>타입: {button.jumpIfVisibleType}</div>
                          )}
                          {button.jumpIfVisible && (
                            <div>조건: {button.jumpIfVisible}</div>
                          )}
                          {button.jumpToNo && (
                            <div>점프할 번호: {button.jumpToNo}</div>
                          )}
                        </div>
                      )}
                      {(button.visibleIfType || button.visibleIf) && (
                        <div style={{ marginTop: 8, padding: "8px", background: "#fef3c7", borderRadius: 6, fontSize: 11 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>표시 조건:</div>
                          {button.visibleIfType && (
                            <div>타입: {button.visibleIfType}</div>
                          )}
                          {button.visibleIf && (
                            <div>조건: {button.visibleIf}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              background: "var(--primary)",
              color: "#1c1d21",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

