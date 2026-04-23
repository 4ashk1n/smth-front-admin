import type { ArticleStatus } from "@smth/shared";

export function statusColor(status: ArticleStatus): string {
  switch (status) {
    case "published":
      return "green";
    case "review":
      return "yellow";
    case "draft":
      return "blue";
    case "archived":
      return "gray";
    default:
      return "gray";
  }
}

export function statusLabel(status: ArticleStatus): string {
  switch (status) {
    case "published":
      return "Опубликована";
    case "review":
      return "На ревью";
    case "draft":
      return "Черновик";
    case "archived":
      return "Архив";
    default:
      return status;
  }
}

