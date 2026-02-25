export class Post {
  id: number;
  title: string;
  content?: string;
  published: boolean;
  likeCount: number;
  dislikeCount: number;
  authorId: number;
}
