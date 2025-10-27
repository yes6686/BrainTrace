import React from 'react';
import SourcePanel from './SourcePanel'; // SourcePanel 컴포넌트 불러오기
import './SourcePanel.css';           // **수정한 CSS 파일 불러오기**

export default {
  title: 'Components/SourcePanel', // Storybook 사이드바에 표시될 이름
  component: SourcePanel,
  parameters: {
    layout: 'fullscreen', // 전체 화면으로 보기
  },
};

// 기본 상태의 SourcePanel을 보여주는 스토리
export const Default = () => (
  <div style={{ width: '300px', height: '100vh', borderRight: '1px solid #333' }}>
    <SourcePanel />
  </div>
);