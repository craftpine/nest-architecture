import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface CoinGeckoGoldResponse {
  gold: {
    usd: number;
  };
}

@Injectable()
export class CoingeckoService {
  private readonly logger = new Logger(CoingeckoService.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  constructor(private readonly httpService: HttpService) {}

  async getGoldPrice(): Promise<{ price: number; currency: string; timestamp: Date } | null> {
    try {
      const url = `${this.baseUrl}/simple/price?ids=gold&vs_currencies=usd`;
      this.logger.log(`Fetching gold price from: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get<CoinGeckoGoldResponse>(url)
      );

      if (response.data?.gold?.usd) {
        const result = {
          price: response.data.gold.usd,
          currency: 'USD',
          timestamp: new Date(),
        };

        this.logger.log(`Gold price fetched: ${result.price} ${result.currency}`);
        return result;
      }

      this.logger.warn('Invalid response structure from CoinGecko API');
      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch gold price from CoinGecko: ${error.message}`, error.stack);
      return null;
    }
  }
}