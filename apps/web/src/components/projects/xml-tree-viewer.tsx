"use client";

import React, { useEffect, useState } from "react";

interface XmlNode {
  tag: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text?: string;
}

interface XmlTreeViewerProps {
  xmlContent: string | null;
  onElementSelect?: (element: XmlNode) => void;
  selectedElement?: XmlNode | null;
}

export function XmlTreeViewer({ xmlContent, onElementSelect, selectedElement }: XmlTreeViewerProps) {
  const [parsedXml, setParsedXml] = useState<XmlNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!xmlContent) {
      setParsedXml(null);
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, "text/xml");
      const root = doc.documentElement;

      const parseNode = (node: Element): XmlNode => {
        const attributes: Record<string, string> = {};
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          attributes[attr.name] = attr.value;
        }

        const children: XmlNode[] = [];
        for (let i = 0; i < node.children.length; i++) {
          children.push(parseNode(node.children[i] as Element));
        }

        return {
          tag: node.tagName,
          attributes,
          children,
          text: node.textContent?.trim() || undefined
        };
      };

      const rootNode = parseNode(root);
      setParsedXml(rootNode);
      // 루트 노드는 기본적으로 확장
      setExpandedNodes(new Set(["root"]));
    } catch (error) {
      console.error("XML 파싱 실패:", error);
      setParsedXml(null);
    }
  }, [xmlContent]);

  const getNodeId = (node: XmlNode, path: string = ""): string => {
    return path || "root";
  };

  const renderNode = (node: XmlNode, level: number = 0, path: string = ""): React.ReactNode => {
    const nodeId = getNodeId(node, path);
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.children.length > 0;
    const isSelected = selectedElement === node;

    const nodeText = node.attributes["text"] || node.attributes["content-desc"] || node.attributes["resource-id"] || node.tag;
    const matchesSearch = !searchTerm || nodeText.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch && !hasChildren) {
      return null;
    }

    return (
      <div key={nodeId} style={{ marginLeft: level * 16 }}>
        <div
          onClick={() => {
            if (hasChildren) {
              const newExpanded = new Set(expandedNodes);
              if (isExpanded) {
                newExpanded.delete(nodeId);
              } else {
                newExpanded.add(nodeId);
              }
              setExpandedNodes(newExpanded);
            }
            onElementSelect?.(node);
          }}
          style={{
            padding: "4px 8px",
            cursor: "pointer",
            background: isSelected ? "var(--primary-light)" : "transparent",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            fontFamily: "monospace"
          }}
        >
          {hasChildren && (
            <span style={{ width: 12, display: "inline-block" }}>
              {isExpanded ? "▼" : "▶"}
            </span>
          )}
          {!hasChildren && <span style={{ width: 12, display: "inline-block" }} />}
          <span style={{ color: "#d32f2f" }}>&lt;{node.tag}</span>
          {node.attributes["resource-id"] && (
            <span style={{ color: "#1976d2" }}>
              {" "}resource-id="{node.attributes["resource-id"]}"
            </span>
          )}
          {node.attributes["text"] && (
            <span style={{ color: "#388e3c" }}>
              {" "}text="{node.attributes["text"]}"
            </span>
          )}
          {node.attributes["content-desc"] && (
            <span style={{ color: "#f57c00" }}>
              {" "}content-desc="{node.attributes["content-desc"]}"
            </span>
          )}
          <span style={{ color: "#d32f2f" }}>&gt;</span>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child, idx) => renderNode(child, level + 1, `${path}.${idx}`))}
          </div>
        )}
      </div>
    );
  };

  if (!xmlContent) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
        <p>XML 계층 구조를 불러오려면 스크린샷을 클릭하거나 새로고침 버튼을 클릭하세요.</p>
      </div>
    );
  }

  if (!parsedXml) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
        <p>XML을 파싱할 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 8, borderBottom: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search Source"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "4px 8px",
            fontSize: 12
          }}
        />
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>0</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {renderNode(parsedXml)}
      </div>
    </div>
  );
}

