import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(createPostDto: CreatePostDto, authorId: number) {
    return this.prisma.post.create({
      data: {
        title: createPostDto.title,
        content: createPostDto.content,
        published: createPostDto.published || false,
        authorId,
      },
    });
  }

  async findAll() {
    return this.prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async findByAuthorId(authorId: number) {
    return this.prisma.post.findMany({
      where: { authorId },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: number, updatePostDto: UpdatePostDto, userId: number) {
    // Verify ownership
    const post = await this.prisma.post.findUnique({
      where: { id },
    });
    if (!post || post.authorId !== userId) {
      throw new ForbiddenException(
        'Unauthorized: You can only update your own posts',
      );
    }
    return this.prisma.post.update({
      where: { id },
      data: updatePostDto,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: number, userId: number) {
    // Verify ownership
    const post = await this.prisma.post.findUnique({
      where: { id },
    });
    if (!post || post.authorId !== userId) {
      throw new ForbiddenException(
        'Unauthorized: You can only delete your own posts',
      );
    }
    return this.prisma.post.delete({
      where: { id },
    });
  }

  async like(id: number) {
    return this.prisma.post.update({
      where: { id },
      data: {
        likeCount: {
          increment: 1,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async dislike(id: number) {
    return this.prisma.post.update({
      where: { id },
      data: {
        dislikeCount: {
          increment: 1,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }
}
