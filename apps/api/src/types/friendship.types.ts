export interface FriendShipPayload {
  requesterId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
}

export interface FriendShipResponse {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
  message?: string;
}

export interface FriendShipListResponse {
  friendships: FriendShipResponse[];
  totalCount: number;
}
