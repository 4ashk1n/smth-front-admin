import type {
  AdminModerateArticleResponse,
  AdminModerateUserResponse,
  AdminReviewArticleListResponse,
  AdminUserArticleListResponse,
  AdminUserListResponse,
  ArticleResponse,
  ArticleStatus,
  ReviewRemarkListResponse,
  ReviewRemarkResponse,
  UserMeta,
  UserMetricsResponse,
} from "@smth/shared";
import { requestWithAutoRefresh } from "./auth";

type ReviewQuery = {
  page?: number;
  limit?: number;
  search?: string;
  authorId?: string;
};

type UsersQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

type UserArticlesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ArticleStatus;
};

type UserMetaResponse = {
  success: true;
  data: UserMeta;
};

export function getReviewArticles(query: ReviewQuery): Promise<AdminReviewArticleListResponse> {
  return requestWithAutoRefresh<AdminReviewArticleListResponse>("/admin/articles/review", {
    method: "GET",
    query,
  });
}

export function approveArticle(articleId: string): Promise<AdminModerateArticleResponse> {
  return requestWithAutoRefresh<AdminModerateArticleResponse>(`/admin/articles/${articleId}/approve`, {
    method: "POST",
  });
}

export function rejectArticle(articleId: string): Promise<AdminModerateArticleResponse> {
  return requestWithAutoRefresh<AdminModerateArticleResponse>(`/admin/articles/${articleId}/reject`, {
    method: "POST",
  });
}

export function archiveArticle(articleId: string): Promise<AdminModerateArticleResponse> {
  return requestWithAutoRefresh<AdminModerateArticleResponse>(`/admin/articles/${articleId}/archive`, {
    method: "POST",
  });
}

export function publishArchivedArticle(articleId: string): Promise<AdminModerateArticleResponse> {
  return requestWithAutoRefresh<AdminModerateArticleResponse>(`/admin/articles/${articleId}/publish`, {
    method: "POST",
  });
}

export function getUsers(query: UsersQuery): Promise<AdminUserListResponse> {
  return requestWithAutoRefresh<AdminUserListResponse>("/admin/users", {
    method: "GET",
    query,
  });
}

export function banUser(userId: string): Promise<AdminModerateUserResponse> {
  return requestWithAutoRefresh<AdminModerateUserResponse>(`/admin/users/${userId}/ban`, {
    method: "POST",
  });
}

export function unbanUser(userId: string): Promise<AdminModerateUserResponse> {
  return requestWithAutoRefresh<AdminModerateUserResponse>(`/admin/users/${userId}/unban`, {
    method: "POST",
  });
}

export function getUserArticles(userId: string, query: UserArticlesQuery): Promise<AdminUserArticleListResponse> {
  return requestWithAutoRefresh<AdminUserArticleListResponse>(`/admin/users/${userId}/articles`, {
    method: "GET",
    query,
  });
}

export function getUserById(userId: string): Promise<UserMetaResponse> {
  return requestWithAutoRefresh<UserMetaResponse>(`/users/${userId}`, {
    method: "GET",
  });
}

export function getUserMetrics(userId: string): Promise<UserMetricsResponse> {
  return requestWithAutoRefresh<UserMetricsResponse>(`/users/${userId}/metrics`, {
    method: "GET",
  });
}

export function getArticleById(articleId: string): Promise<ArticleResponse> {
  return requestWithAutoRefresh<ArticleResponse>(`/articles/${articleId}`, {
    method: "GET",
  });
}

export function getArticleRemarks(articleId: string): Promise<ReviewRemarkListResponse> {
  return requestWithAutoRefresh<ReviewRemarkListResponse>(`/admin/articles/${articleId}/remarks`, {
    method: "GET",
  });
}

export function upsertArticleRemark(articleId: string, blockId: string, text: string): Promise<ReviewRemarkResponse> {
  return requestWithAutoRefresh<ReviewRemarkResponse>(`/admin/articles/${articleId}/remarks/${blockId}`, {
    method: "PUT",
    body: { text },
  });
}

export function deleteArticleRemark(articleId: string, blockId: string): Promise<ReviewRemarkResponse> {
  return requestWithAutoRefresh<ReviewRemarkResponse>(`/admin/articles/${articleId}/remarks/${blockId}`, {
    method: "DELETE",
  });
}
