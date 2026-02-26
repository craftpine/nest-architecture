import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { GoldPricesModule } from './gold-prices/gold-prices.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({}),
    PrismaModule,
    UsersModule,
    AuthModule,
    PostsModule,
    GoldPricesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
