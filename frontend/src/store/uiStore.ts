import { create } from 'zustand';
import type { FetchPodsParams } from '@/types/pod';

type ModalType = 'rating' | 'confirm_leave' | 'pod_create';

interface UiStore {
  // 홈 화면 지도/리스트 뷰 전환
  isMapView: boolean;
  toggleMapView: () => void;

  // 팟 검색 필터
  searchFilter: Partial<FetchPodsParams>;
  setSearchFilter: (filter: Partial<FetchPodsParams>) => void;
  resetSearchFilter: () => void;

  // 모달
  activeModal: ModalType | null;
  modalData: unknown;
  openModal: (type: ModalType, data?: unknown) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  isMapView: true,
  toggleMapView: () => set((s) => ({ isMapView: !s.isMapView })),

  searchFilter: {},
  setSearchFilter: (filter) =>
    set((s) => ({ searchFilter: { ...s.searchFilter, ...filter } })),
  resetSearchFilter: () => set({ searchFilter: {} }),

  activeModal: null,
  modalData: null,
  openModal: (type, data = null) => set({ activeModal: type, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}));
