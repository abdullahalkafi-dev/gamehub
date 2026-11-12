import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '@/lib/format';
import type {
  Board,
  CoinPackage,
  CreateRoomInput,
  HistoryResponse,
  JoinResponse,
  MeResponse,
  PurchaseRow,
  RoomView,
  Stats,
  User,
} from '@/lib/types';

// One RTK Query API for the whole app. The httpOnly cookie travels with every call
// (credentials: include); X-Requested-With is the CSRF guard the server expects.
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    credentials: 'include',
    prepareHeaders: (h) => {
      h.set('X-Requested-With', 'gamehub');
      return h;
    },
  }),
  tagTypes: ['Me', 'Rooms', 'History', 'Purchases', 'Admin'],
  endpoints: (b) => ({
    // ---- auth
    me: b.query<MeResponse, void>({ query: () => '/auth/me', providesTags: ['Me'] }),
    login: b.mutation<{ user: User }, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: b.mutation<{ user: User }, { email: string; password: string; displayName: string }>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    logout: b.mutation<{ ok: true }, void>({ query: () => ({ url: '/auth/logout', method: 'POST' }) }),
    updateProfile: b.mutation<{ user: User }, { displayName: string }>({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
    changePassword: b.mutation<{ ok: true }, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),

    // ---- rooms
    rooms: b.query<{ rooms: RoomView[] }, void>({ query: () => '/rooms', providesTags: ['Rooms'] }),
    createRoom: b.mutation<{ room: RoomView }, CreateRoomInput>({
      query: (body) => ({ url: '/rooms', method: 'POST', body }),
      invalidatesTags: ['Rooms'],
    }),
    deleteRoom: b.mutation<{ ok: true }, string>({
      query: (key) => ({ url: `/rooms/${key}`, method: 'DELETE' }),
      invalidatesTags: ['Rooms'],
    }),
    roomByCode: b.query<{ room: { key: string; name: string } }, string>({ query: (code) => `/rooms/by-code/${encodeURIComponent(code)}` }),
    // A play link lives 15 minutes, so it is requested only when someone presses Join.
    join: b.mutation<JoinResponse, { key: string; inviteCode?: string }>({
      query: ({ key, inviteCode }) => ({ url: `/rooms/${key}/join`, method: 'POST', body: { inviteCode } }),
      invalidatesTags: ['Me'],
    }),

    // ---- history
    history: b.query<HistoryResponse, { room?: string; before?: number }>({
      query: ({ room, before }) => ({ url: '/history', params: { limit: 20, room, before } }),
      providesTags: ['History'],
    }),
    stats: b.query<Stats, void>({ query: () => '/history/stats', providesTags: ['History'] }),

    // ---- shop
    packages: b.query<{ packages: CoinPackage[] }, void>({ query: () => '/shop/packages' }),
    purchase: b.mutation<{ coins: number; balance: number | null }, { packageId: string; clientKey: string }>({
      query: (body) => ({ url: '/shop/purchase', method: 'POST', body }),
      invalidatesTags: ['Me', 'Purchases'],
    }),
    purchases: b.query<{ purchases: PurchaseRow[] }, void>({ query: () => '/shop/purchases', providesTags: ['Purchases'] }),

    // ---- leaderboard
    leaderboard: b.query<Board, { period: string; metric: string; room?: string }>({
      query: (params) => ({ url: '/leaderboard', params }),
    }),

    // ---- admin
    adminOverview: b.query<
      { users: number; rooms: number; purchases: number; coinsSold: number; recentWebhooks: { id: string; type: string; livemode: boolean; receivedAt: string; summary: Record<string, unknown> }[] },
      void
    >({ query: () => '/admin/overview', providesTags: ['Admin'] }),
    adminUsers: b.query<{ total: number; users: (User & { createdAt: string })[] }, number>({ query: (page) => `/admin/users?page=${page}` }),
    adminRooms: b.query<{ rooms: { key: string; name: string; visibility: string; capacity: number; owner: string; createdAt: string }[] }, void>({
      query: () => '/admin/rooms',
      providesTags: ['Admin'],
    }),
  }),
});

export const {
  useMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useRoomsQuery,
  useCreateRoomMutation,
  useDeleteRoomMutation,
  useLazyRoomByCodeQuery,
  useJoinMutation,
  useHistoryQuery,
  useStatsQuery,
  usePackagesQuery,
  usePurchaseMutation,
  usePurchasesQuery,
  useLeaderboardQuery,
  useAdminOverviewQuery,
  useAdminUsersQuery,
  useAdminRoomsQuery,
} = api;
