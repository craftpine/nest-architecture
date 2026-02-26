import { Controller, Get, Post, Body, Param, Query, NotFoundException, ParseIntPipe, Logger } from '@nestjs/common';
import { GoldPricesService } from './gold-prices.service';
import { CreateGoldPriceDto } from './dto/create-gold-price.dto';
import { GoldPriceQueryDto } from './dto/gold-price-query.dto';
import { GoldPriceResponseDto } from './dto/gold-price-response.dto';

@Controller('gold-prices')
export class GoldPricesController {
  private readonly logger = new Logger(GoldPricesController.name);

  constructor(private readonly goldPricesService: GoldPricesService) {}

  @Get('latest')
  async getLatestPrices(@Query() query: GoldPriceQueryDto): Promise<GoldPriceResponseDto[]> {
    this.logger.log(`Getting latest prices with query: ${JSON.stringify(query)}`);
    return this.goldPricesService.findLatest(query);
  }

  @Get('historical')
  async getHistoricalPrices(@Query() query: GoldPriceQueryDto): Promise<GoldPriceResponseDto[]> {
    this.logger.log(`Getting historical prices with query: ${JSON.stringify(query)}`);
    return this.goldPricesService.findAll(query);
  }

  @Post('collect')
  async manualCollect(): Promise<{ message: string; timestamp: string }> {
    this.logger.log('Manual collection triggered');

    // Run collection in background, don't wait for completion
    this.goldPricesService.collectAllPrices().catch(error => {
      this.logger.error('Manual collection failed:', error);
    });

    return {
      message: 'Gold price collection started',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<GoldPriceResponseDto> {
    this.logger.log(`Getting gold price by ID: ${id}`);

    const goldPrice = await this.goldPricesService.findOne(id);
    if (!goldPrice) {
      throw new NotFoundException(`Gold price with ID ${id} not found`);
    }

    return goldPrice;
  }

  @Get()
  async findAll(@Query() query: GoldPriceQueryDto): Promise<GoldPriceResponseDto[]> {
    this.logger.log(`Getting all prices with query: ${JSON.stringify(query)}`);
    return this.goldPricesService.findAll(query);
  }

  @Post()
  async create(@Body() createGoldPriceDto: CreateGoldPriceDto): Promise<GoldPriceResponseDto> {
    this.logger.log(`Creating new gold price: ${JSON.stringify(createGoldPriceDto)}`);
    return this.goldPricesService.create(createGoldPriceDto);
  }
}