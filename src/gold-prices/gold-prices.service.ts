import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WorldGoldService } from './services/world-gold.service';
import { VietnamScraperService } from './services/vietnam-scraper.service';
import { CreateGoldPriceDto } from './dto/create-gold-price.dto';
import { GoldPriceQueryDto } from './dto/gold-price-query.dto';
import { GoldPriceResponseDto } from './dto/gold-price-response.dto';

@Injectable()
export class GoldPricesService {
  private readonly logger = new Logger(GoldPricesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly worldGoldService: WorldGoldService,
    private readonly vietnamScraper: VietnamScraperService,
  ) {}

  // Scheduled task: run every 4 hours
  @Cron('0 */1 * * *')
  async collectAllPrices() {
    this.logger.log('Starting scheduled gold price collection');

    const results = await Promise.allSettled([
      this.collectWorldPrices(),
      this.collectVietnamPrices(),
    ]);

    const worldResult = results[0];
    const vietnamResult = results[1];

    let total = 0;
    if (worldResult.status === 'fulfilled') {
      total += worldResult.value;
    } else {
      this.logger.error('World prices collection failed', worldResult.reason);
    }

    if (vietnamResult.status === 'fulfilled') {
      total += vietnamResult.value;
    } else {
      this.logger.error('Vietnam prices collection failed', vietnamResult.reason);
    }

    this.logger.log(`Scheduled collection completed. Total prices collected: ${total}`);
  }

  async collectWorldPrices(): Promise<number> {
    this.logger.log('Collecting world gold prices');

    const goldPrice = await this.worldGoldService.getGoldPrice();
    if (!goldPrice) {
      this.logger.warn('No world gold price data available');
      return 0;
    }

    const createDto: CreateGoldPriceDto = {
      type: 'world',
      goldType: 'spot',
      sellPrice: goldPrice.price, // World gold is typically spot price
      currency: goldPrice.currency,
      source: 'world-gold-service',
      sourceUrl: 'https://vn.investing.com/currencies/xau-usd',
      timestamp: goldPrice.timestamp,
    };

    try {
      await this.create(createDto);
      this.logger.log(`World gold price saved: ${goldPrice.price} ${goldPrice.currency}`);
      return 1;
    } catch (error) {
      this.logger.error(`Failed to save world gold price: ${error.message}`);
      return 0;
    }
  }

  async collectVietnamPrices(): Promise<number> {
    this.logger.log('Collecting Vietnam gold prices');

    const vietnamPrices = await this.vietnamScraper.getAllVietnamPrices();
    if (vietnamPrices.length === 0) {
      this.logger.warn('No Vietnam gold price data available');
      return 0;
    }

    let savedCount = 0;
    for (const price of vietnamPrices) {
      const createDto: CreateGoldPriceDto = {
        type: 'vietnam',
        goldType: price.goldType,
        buyPrice: price.buyPrice,
        sellPrice: price.sellPrice,
        currency: 'VND',
        source: price.source,
        sourceUrl: price.sourceUrl,
        timestamp: price.timestamp,
      };

      try {
        await this.create(createDto);
        savedCount++;
      } catch (error) {
        this.logger.error(`Failed to save Vietnam gold price ${price.goldType}: ${error.message}`);
      }
    }

    this.logger.log(`Vietnam gold prices saved: ${savedCount}/${vietnamPrices.length}`);
    return savedCount;
  }

  async create(createDto: CreateGoldPriceDto): Promise<GoldPriceResponseDto> {
    const goldPrice = await this.prisma.goldPrice.create({
      data: createDto,
    });

    return this.mapToResponseDto(goldPrice);
  }

  async findAll(query: GoldPriceQueryDto): Promise<GoldPriceResponseDto[]> {
    const where: any = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.goldType) {
      where.goldType = query.goldType;
    }

    if (query.currency) {
      where.currency = query.currency;
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.from || query.to) {
      where.timestamp = {};
      if (query.from) {
        where.timestamp.gte = new Date(query.from);
      }
      if (query.to) {
        where.timestamp.lte = new Date(query.to);
      }
    }

    const goldPrices = await this.prisma.goldPrice.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: query.limit ? Math.min(query.limit, 100) : 50, // Max 100, default 50
      skip: query.offset || 0,
    });

    return goldPrices.map(this.mapToResponseDto);
  }

  async findLatest(query: GoldPriceQueryDto): Promise<any> {
    // Build WHERE clause for filtering
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(query.type);
      paramIndex++;
    }

    if (query.goldType) {
      conditions.push(`"goldType" = $${paramIndex}`);
      params.push(query.goldType);
      paramIndex++;
    }

    if (query.source) {
      conditions.push(`source = $${paramIndex}`);
      params.push(query.source);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Use window function to get 20 latest records per goldType
    const sql = `
      WITH ranked_prices AS (
        SELECT
          *,
          ROW_NUMBER() OVER (
            PARTITION BY type, "goldType"
            ORDER BY timestamp DESC
          ) AS rn
        FROM gold_prices
        ${whereClause}
      )
      SELECT
        id, type, "goldType", "buyPrice", "sellPrice",
        currency, source, "sourceUrl", timestamp,
        "createdAt", "updatedAt"
      FROM ranked_prices
      WHERE rn <= 20
      ORDER BY type, "goldType", timestamp DESC
    `;

    const goldPrices = await this.prisma.$queryRawUnsafe(sql, ...params);

    // Group results by goldType
    const grouped = new Map<string, any[]>();

    for (const price of goldPrices as any[]) {
      const goldType = price.goldType;

      if (!grouped.has(goldType)) {
        grouped.set(goldType, []);
      }

      grouped.get(goldType)!.push({
        id: price.id,
        type: price.type,
        goldType: price.goldType,
        buyPrice: price.buyPrice,
        sellPrice: price.sellPrice,
        currency: price.currency,
        source: price.source,
        sourceUrl: price.sourceUrl,
        timestamp: price.timestamp.toISOString(),
        createdAt: price.createdAt.toISOString(),
        updatedAt: price.updatedAt.toISOString(),
      });
    }

    // Convert Map to array of grouped objects
    return Array.from(grouped.entries()).map(([goldType, records]) => ({
      goldType,
      records,
      count: records.length,
    }));
  }

  async findOne(id: number): Promise<GoldPriceResponseDto | null> {
    const goldPrice = await this.prisma.goldPrice.findUnique({
      where: { id },
    });

    if (!goldPrice) {
      return null;
    }

    return this.mapToResponseDto(goldPrice);
  }

  private mapToResponseDto(goldPrice: any): GoldPriceResponseDto {
    return {
      id: goldPrice.id,
      type: goldPrice.type,
      goldType: goldPrice.goldType,
      buyPrice: goldPrice.buyPrice,
      sellPrice: goldPrice.sellPrice,
      currency: goldPrice.currency,
      source: goldPrice.source,
      sourceUrl: goldPrice.sourceUrl,
      timestamp: goldPrice.timestamp.toISOString(),
      createdAt: goldPrice.createdAt.toISOString(),
      updatedAt: goldPrice.updatedAt.toISOString(),
    };
  }
}