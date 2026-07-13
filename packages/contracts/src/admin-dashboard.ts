import type { SubAdminListItem } from "./admin-role";
import type { ActivityLogListItem } from "./activity-log";
import type { ChatMessageListItem, ChatRoomListItem } from "./chat";
import type { DonorListItem } from "./donor";
import type { ProfileUpdateRequestListItem } from "./family-profile-update-request";
import type { SponsorshipListItem } from "./sponsorship";
import type { TransferProofListItem } from "./transfer-proof";

export interface AdminTransferProofStatusBreakdown {
  pending: number;
  accepted: number;
  rejected: number;
  clarification: number;
  disputed: number;
}

export interface AdminTopDonorItem {
  id: string;
  fullName: string;
  email: string;
  profileImageUrl: string | null;
  totalMonthlyAmount: number;
  activeSponsorships: number;
}

export interface AdminDashboardBreakdown {
  partial: number;
  full: number;
}

export interface AdminFamilyCoverageBreakdown {
  partiallyCovered: number;
  fullyCovered: number;
  notCovered: number;
  expired: number;
}

export interface AdminSponsorshipStatusBreakdown {
  requested: number;
  active: number;
  paused: number;
  completed: number;
  cancelled: number;
  stopped: number;
  disputed: number;
}

export interface AdminChatMessageStatusBreakdown {
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  edited: number;
}

export interface AdminDashboardRecentLists {
  latestSponsors: DonorListItem[];
  latestActiveSponsorships: SponsorshipListItem[];
  latestPendingMessages: ChatMessageListItem[];
  latestProfileUpdateRequests: ProfileUpdateRequestListItem[];
  latestActivityLogs: ActivityLogListItem[];
  latestChatRooms: ChatRoomListItem[];
  latestTransferProofs: TransferProofListItem[];
  latestPendingTransferProofs: TransferProofListItem[];
}

export interface AdminDashboardOverview {
  totalFamilies: number;
  hiddenFamilies: number;
  partiallySponsoredFamilies: number;
  fullyCoveredFamilies: number;
  totalSponsors: number;
  activeSponsorshipRelationships: number;
  messagesPendingReview: number;
  profileUpdateRequestsPending: number;
  totalActivityLogs: number;
  totalTransferProofs: number;
  transferProofsPendingReview: number;
  sponsorshipTypeBreakdown: AdminDashboardBreakdown;
  familyCoverageBreakdown: AdminFamilyCoverageBreakdown;
  sponsorshipStatusBreakdown: AdminSponsorshipStatusBreakdown;
  chatMessageStatusBreakdown: AdminChatMessageStatusBreakdown;
  transferProofStatusBreakdown: AdminTransferProofStatusBreakdown;
  topDonors: AdminTopDonorItem[];
  subAdmins: SubAdminListItem[];
  recentLists: AdminDashboardRecentLists;
}

export interface AdminDashboardResponse {
  overview: AdminDashboardOverview;
}
