import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GoldPricesController } from './gold-prices.controller';
import { GoldPricesService } from './gold-prices.service';
import { CoingeckoService } from './services/coingecko.service';
import { VietnamScraperService } from './services/vietnam-scraper.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
  ],
  controllers: [GoldPricesController],
  providers: [
    GoldPricesService,
    CoingeckoService,
    VietnamScraperService,
  ],
  exports: [GoldPricesService],
})
export class GoldPricesModule {}