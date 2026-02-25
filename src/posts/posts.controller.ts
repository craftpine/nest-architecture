import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPostDto: CreatePostDto, @Request() req: any) {
    return this.postsService.create(createPostDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  getMyPosts(@Request() req: any) {
    return this.postsService.findByAuthorId(req.user.userId);
  }

  @Get('author/:authorId')
  findByAuthorId(@Param('authorId', ParseIntPipe) authorId: number) {
    return this.postsService.findByAuthorId(authorId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req: any,
  ) {
    return this.postsService.update(id, updatePostDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.postsService.remove(id, req.user.userId);
  }

  @Post(':id/like')
  like(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.like(id);
  }

  @Post(':id/dislike')
  dislike(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.dislike(id);
  }
}
