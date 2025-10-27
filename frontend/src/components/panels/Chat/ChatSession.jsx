// === ChatSession: 채팅 세션 관리 컴포넌트 ===
// - 브레인별 채팅 세션 목록 표시 및 관리
// - 새 채팅 세션 생성, 기존 세션 삭제, 세션 이름 변경 기능
// - 세션 선택 시 ChatPanel로 전달하여 채팅 시작
// - 드롭다운 메뉴를 통한 세션 관리 (Portal 렌더링)
// - 실시간 세션 상태 업데이트 및 애니메이션 효과

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import "./ChatSession.css";
import {
  fetchChatSessionsByBrain,
  createChatSession,
  deleteChatSession,
  renameChatSession,
} from "../../../../api/services/chatApi";
import { PiChatsCircle } from "react-icons/pi";
import { RiDeleteBinLine } from "react-icons/ri";
import { GoPencil } from "react-icons/go";
import ConfirmDialog from "../../common/ConfirmDialog";

function ChatSession({
  selectedBrainId, // 선택된 브레인 ID
  onSessionSelect, // 세션 선택 시 호출되는 콜백
  onChatReady, // 채팅 준비 상태 변경 시 호출되는 콜백
}) {
  // === 상태 관리 ===
  const [sessions, setSessions] = useState([]); // 채팅 세션 목록
  const [selectedSession, setSelectedSession] = useState(null); // 현재 선택된 세션 ID
  const [loading, setLoading] = useState(false); // 세션 목록 로딩 상태
  const [creating, setCreating] = useState(false); // 새 세션 생성 중 상태
  const [openMenuId, setOpenMenuId] = useState(null); // 열린 드롭다운 메뉴의 세션 ID
  const [isEditingId, setIsEditingId] = useState(null); // 편집 중인 세션 ID
  const [editingTitle, setEditingTitle] = useState(""); // 편집 중인 세션 제목
  const [newlyCreatedSessionId, setNewlyCreatedSessionId] = useState(null); // 새로 생성된 세션 ID (깜빡임 효과용)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 }); // 드롭다운 메뉴 위치
  const [lastClickTime, setLastClickTime] = useState(0); // 마지막 클릭 시간 (디바운싱용)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // 삭제 확인 다이얼로그 표시 여부
  const [sessionToDelete, setSessionToDelete] = useState(null); // 삭제할 세션 정보
  const [isDeleting, setIsDeleting] = useState(false); // 세션 삭제 중 상태

  const menuRef = useRef(null); // 메뉴 컨테이너 참조

  // === 세션 데이터 관리 ===
  // 브레인별 채팅 세션 목록을 불러오는 함수
  const loadSessions = async () => {
    if (!selectedBrainId) {
      setSessions([]);
      if (onChatReady) onChatReady(true);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchChatSessionsByBrain(selectedBrainId);
      setSessions(data);
      if (onChatReady) onChatReady(true);
    } catch (e) {
      setSessions([]);
      if (onChatReady) onChatReady(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [selectedBrainId]);

  // === 유틸리티 함수 ===
  // 타임스탬프를 YYYY.MM.DD 형태로 포맷팅하는 함수 (한국 시간대 기준)
  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    let date;
    if (typeof timestamp === "string") {
      // SQLite DATETIME 문자열 형태 (예: "2024-01-15 10:30:45")
      date = new Date(timestamp);
    } else {
      // 숫자 타임스탬프
      date = new Date(Number(timestamp));
    }

    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      return "";
    }

    // 한국 시간대(KST, Asia/Seoul)로 변환
    const koreanDate = new Date(
      date.toLocaleString("en-US", {
        timeZone: "Asia/Seoul",
      })
    );

    const year = koreanDate.getFullYear();
    const month = `${koreanDate.getMonth() + 1}`.padStart(2, "0");
    const day = `${koreanDate.getDate()}`.padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  // === 드롭다운 메뉴 관리 ===
  // 세션별 드롭다운 메뉴를 토글하는 함수
  const toggleMenu = (sessionId, event) => {
    if (openMenuId === sessionId) {
      setOpenMenuId(null);
    } else {
      // 메뉴 버튼의 위치 계산하여 Portal 렌더링 위치 설정
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 160, // 메뉴 너비만큼 왼쪽으로
      });
      setOpenMenuId(sessionId);
    }
  };

  // === 세션 생성 ===
  // 새로운 채팅 세션을 생성하는 함수 (디바운싱 및 애니메이션 효과 포함)
  const handleCreateSession = async () => {
    // 디바운싱: 1초 내 중복 클릭 방지
    const now = Date.now();
    if (now - lastClickTime < 1000) {
      return;
    }
    setLastClickTime(now);

    if (creating || !selectedBrainId) return;
    setCreating(true);
    try {
      const result = await createChatSession("Untitled", selectedBrainId);

      // 새로 생성된 세션을 임시로 리스트에 추가 (깜빡임 효과용)
      const tempSession = {
        session_id: result.session_id,
        session_name: "Untitled",
        created_at: Date.now(),
        brain_id: selectedBrainId,
      };
      setSessions((prev) => [tempSession, ...prev]);
      setNewlyCreatedSessionId(result.session_id);

      // 2초 후 깜빡임 효과 제거하고 실제 데이터로 업데이트
      setTimeout(async () => {
        setNewlyCreatedSessionId(null);
        await loadSessions(); // 실제 데이터로 새로고침
      }, 2000);

      // 1.5초 후 ChatPanel로 이동 (깜빡임 효과를 보여주기 위해)
      setTimeout(() => {
        if (onSessionSelect) {
          onSessionSelect(result.session_id, {
            isNewSession: true,
            sessionInfo: tempSession,
          });
        }
      }, 1500);
    } catch (error) {
      console.error("채팅방 생성 실패:", error);
      alert("채팅방 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  // === 세션 삭제 ===
  // 세션 삭제 확인 다이얼로그를 표시하는 함수
  const handleDeleteSession = (session_id) => {
    setSessionToDelete(session_id);
    setShowDeleteConfirm(true);
    setOpenMenuId(null);
  };

  // 세션 삭제를 실제로 실행하는 함수
  const executeDeleteSession = async () => {
    if (!sessionToDelete) return;

    setIsDeleting(true);
    try {
      await deleteChatSession(sessionToDelete);

      // 해당 세션의 localStorage 데이터 삭제
      try {
        const sessionKey = `selectedModel_${sessionToDelete}`;
        localStorage.removeItem(sessionKey);
        console.log(`세션 ${sessionToDelete}의 localStorage 데이터 삭제 완료`);
      } catch (localStorageError) {
        console.warn("localStorage 삭제 실패:", localStorageError);
      }

      if (selectedSession === sessionToDelete) setSelectedSession(null);
      await loadSessions();
    } catch (error) {
      console.error("채팅방 삭제 실패:", error);
      alert("채팅방 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setSessionToDelete(null);
    }
  };

  // === 세션 이름 수정 ===
  // 세션 이름 편집 모드를 시작하는 함수
  const handleEditStart = (session) => {
    setIsEditingId(session.session_id);
    setEditingTitle(session.session_name || "Untitled");
    setOpenMenuId(null);
  };

  // 세션 이름 편집을 완료하고 저장하는 함수
  const handleEditFinish = async () => {
    if (editingTitle.trim() && isEditingId) {
      try {
        await renameChatSession(isEditingId, editingTitle.trim());
        await loadSessions(); // 세션 리스트 새로고침
        console.log("세션 이름 수정 완료:", isEditingId, editingTitle.trim());
      } catch (error) {
        console.error("세션 이름 수정 실패:", error);
        alert("세션 이름 수정에 실패했습니다.");
      }
    }
    setIsEditingId(null);
    setEditingTitle("");
  };

  // === 이벤트 핸들링 ===
  // 외부 클릭 시 드롭다운 메뉴를 닫는 이벤트 리스너
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideMenuButton = event.target.closest(
        ".chat-session-menu-button"
      );
      const isInsideDropdown = event.target.closest(
        ".chat-session-dropdown-menu"
      );

      if (!isInsideMenuButton && !isInsideDropdown) {
        setOpenMenuId(null);
      }
    };

    // Portal로 렌더링된 메뉴가 있을 때만 이벤트 리스너 추가
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openMenuId]);

  return (
    <div className="chat-session-panel-container">
      {/* === 헤더 영역 === */}
      <div className="chat-session-panel-header">
        <span className="chat-session-header-title">Chat</span>
      </div>

      {/* === 새 채팅 버튼 영역 === */}
      <div className="chat-session-sidebar-header">
        <h2>채팅 목록</h2>
        <button
          onClick={handleCreateSession}
          disabled={creating || !selectedBrainId}
          className="chat-session-new-chat-button"
        >
          {creating ? "생성 중..." : "+ 새 채팅"}
        </button>
      </div>

      {/* === 세션 목록 영역 === */}
      <ul className="chat-session-list">
        {loading ? (
          <li className="chat-session-loading-item">불러오는 중...</li>
        ) : sessions.length === 0 ? (
          <li className="chat-session-empty-item">
            <div className="chat-session-empty-content">
              <div className="chat-session-empty-icon"></div>
              <div className="chat-session-empty-title">
                오늘의 인사이트를 함께 찾아볼까요?
              </div>
              <div className="chat-session-empty-description">
                분석이 필요할 때, Executive Copilot이 도와드립니다.<br/>
            데이터 기반 의사결정을 지금 바로 시작하세요!
              </div>
            </div>
          </li>
        ) : (
          [...sessions]
            .sort((a, b) => Number(b.session_id) - Number(a.session_id)) // 가장 최신 순으로 정렬
            .map((session) => (
              <li
                key={session.session_id}
                className={`chat-session-item 
                  ${session.session_id === selectedSession ? "active" : ""} 
                  ${
                    session.session_id === newlyCreatedSessionId
                      ? "blinking"
                      : ""
                  }`}
                onClick={() => {
                  setSelectedSession(session.session_id);
                  if (onSessionSelect) {
                    onSessionSelect(session.session_id);
                  }
                }}
              >
                {isEditingId === session.session_id ? (
                  <input
                    className="chat-session-edit-input"
                    value={editingTitle}
                    autoFocus
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleEditFinish}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditFinish();
                      if (e.key === "Escape") {
                        setIsEditingId(null);
                        setEditingTitle("");
                      }
                    }}
                  />
                ) : (
                  <div className="chat-session-text-block">
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <PiChatsCircle
                        size={17}
                        color="#999"
                        style={{ marginRight: 7 }}
                      />
                      <span
                        className={`chat-session-title ${
                          session.session_name === undefined ? "undefined" : ""
                        }`}
                      >
                        {session.session_name !== undefined
                          ? session.session_name
                          : "Untitled"}
                      </span>
                    </div>
                    <span className="chat-session-date">
                      {formatDate(session.created_at)}
                    </span>
                  </div>
                )}

                <div
                  className="chat-session-menu-wrapper"
                  ref={menuRef}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="chat-session-menu-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMenu(session.session_id, e);
                    }}
                  >
                    ⋯
                  </button>
                </div>
              </li>
            ))
        )}
      </ul>

      {/* === Portal로 렌더링되는 드롭다운 메뉴 === */}
      {openMenuId &&
        createPortal(
          <div
            className="chat-session-dropdown-menu"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 999999,
            }}
          >
            <div
              className="chat-session-popup-item"
              onClick={() =>
                handleEditStart(
                  sessions.find((s) => s.session_id === openMenuId)
                )
              }
            >
              <GoPencil size={15} style={{ marginRight: 6 }} />
              채팅 이름 바꾸기
            </div>
            <div
              className="chat-session-popup-item"
              onClick={() => handleDeleteSession(openMenuId)}
            >
              <RiDeleteBinLine size={15} style={{ marginRight: 6 }} />
              채팅 삭제
            </div>
          </div>,
          document.body
        )}

      {/* === 안내 문구 === */}
      <p className="chat-session-disclaimer">
        Excutive Copilot는 학습된 정보 기반으로 응답하며, 실제와 다를 수 있습니다.
      </p>

      {/* === 삭제 확인 다이얼로그 === */}
      {showDeleteConfirm && (
        <ConfirmDialog
          message="이 채팅방을 삭제하시겠습니까?"
          onOk={executeDeleteSession}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setSessionToDelete(null);
          }}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}

export default ChatSession;
