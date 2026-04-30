import { create } from 'zustand';
import { NewsItem } from '@/types';

interface UIState {
  // 긴급 뉴스 (Breaking News)
  breakingNews: NewsItem[] | null;
  // 현재 활성 알림
  notifications: any[];
  // 대시보드 레이아웃 설정
  layoutConfig: {
    showAllClocks: boolean;
  };

  // Actions
  setBreakingNews: (news: NewsItem[] | null) => void;
  addNotification: (notification: any) => void;
  removeNotification: (id: string) => void;
  toggleClocks: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  breakingNews: null,
  notifications: [],
  layoutConfig: {
    showAllClocks: true,
  },

  setBreakingNews: (news) => set({ breakingNews: news }),

  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications].slice(0, 5)
  })),

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  toggleClocks: () => set((state) => ({
    layoutConfig: { ...state.layoutConfig, showAllClocks: !state.layoutConfig.showAllClocks }
  })),
}));
