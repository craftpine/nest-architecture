import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as puppeteer from 'puppeteer';

@Injectable()
export class WorldGoldService {
  private readonly logger = new Logger(WorldGoldService.name);

  constructor(private readonly httpService: HttpService) {}

  async getGoldPrice(): Promise<{ price: number; currency: string; timestamp: Date } | null> {
    // Try Investing.com first (reliable and has Vietnamese version)
    const investingPrice = await this.getInvestingComGoldPrice();
    if (investingPrice) return investingPrice;

    // Fallback to GoldPrice.org
    const goldPriceOrgPrice = await this.getGoldPriceOrgPrice();
    if (goldPriceOrgPrice) return goldPriceOrgPrice;

    // Fallback to metals API
    const metalsPrice = await this.getMetalsApiGoldPrice();
    if (metalsPrice) return metalsPrice;

    this.logger.warn('All world gold price sources failed');
    return null;
  }

  private async getInvestingComGoldPrice(): Promise<{ price: number; currency: string; timestamp: Date } | null> {
    let browser;
    try {
      this.logger.log('Fetching XAU/USD price from Investing.com');

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.goto('https://vn.investing.com/currencies/xau-usd', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for price element to load
      await page.waitForSelector('[data-test="instrument-price-last"], .text-2xl, [class*="text-5xl"]', {
        timeout: 10000,
      });

      const price = await page.evaluate(() => {
        // Try multiple selectors for the price
        const selectors = [
          '[data-test="instrument-price-last"]',
          '.text-5xl',
          '.text-2xl',
          '[class*="instrument-price"]',
          '[class*="last-price"]',
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            const priceText = element.textContent?.trim();
            if (priceText) {
              // Remove currency symbols and commas
              const cleanPrice = priceText.replace(/[$,\s]/g, '');
              const priceMatch = cleanPrice.match(/[\d.]+/);
              if (priceMatch) {
                const parsedPrice = parseFloat(priceMatch[0]);
                if (parsedPrice > 1000 && parsedPrice < 10000) {
                  // Gold price should be between $1000-$10000 per oz
                  return parsedPrice;
                }
              }
            }
          }
        }

        // Fallback: search in page content
        const bodyText = document.body.innerText;
        const priceMatch = bodyText.match(/(\d{1},\d{3}\.\d{2})/);
        if (priceMatch) {
          return parseFloat(priceMatch[1].replace(/,/g, ''));
        }

        return null;
      });

      await browser.close();

      if (price && price > 1000 && price < 10000) {
        const result = {
          price,
          currency: 'USD',
          timestamp: new Date(),
        };
        this.logger.log(`Investing.com XAU/USD price fetched: ${result.price} ${result.currency}`);
        return result;
      }

      this.logger.debug('Investing.com: No valid price found');
      return null;
    } catch (error) {
      this.logger.debug(`Investing.com scraping failed: ${error.message}`);
      if (browser) {
        await browser.close();
      }
      return null;
    }
  }

  private async getGoldPriceOrgPrice(): Promise<{ price: number; currency: string; timestamp: Date } | null> {
    let browser;
    try {
      this.logger.log('Fetching gold price from GoldPrice.org');

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.goto('https://goldprice.org/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await page.waitForSelector('[class*="price"], #xauusd', {
        timeout: 10000,
      });

      const price = await page.evaluate(() => {
        // Look for gold spot price
        const priceElements = document.querySelectorAll('[class*="price"], [class*="spot"]');
        for (const element of priceElements) {
          const text = element.textContent || '';
          if (text.includes('$') || text.match(/\d{4}/)) {
            const priceMatch = text.match(/[\d,]+\.?\d*/);
            if (priceMatch) {
              const parsedPrice = parseFloat(priceMatch[0].replace(/,/g, ''));
              if (parsedPrice > 1000 && parsedPrice < 10000) {
                return parsedPrice;
              }
            }
          }
        }
        return null;
      });

      await browser.close();

      if (price && price > 1000) {
        const result = {
          price,
          currency: 'USD',
          timestamp: new Date(),
        };
        this.logger.log(`GoldPrice.org gold price fetched: ${result.price} ${result.currency}`);
        return result;
      }

      this.logger.debug('GoldPrice.org: No valid price found');
      return null;
    } catch (error) {
      this.logger.debug(`GoldPrice.org scraping failed: ${error.message}`);
      if (browser) {
        await browser.close();
      }
      return null;
    }
  }

  private async getMetalsApiGoldPrice(): Promise<{ price: number; currency: string; timestamp: Date } | null> {
    try {
      this.logger.log('Fetching gold price from Metals API');

      const response = await firstValueFrom(
        this.httpService.get('https://api.metals.live/v1/spot/gold', {
          timeout: 10000,
        })
      );

      if (response.data?.gold?.usd) {
        // Convert per gram to per troy ounce (1 troy oz = 31.1035 grams)
        const pricePerOunce = response.data.gold.usd * 31.1035;

        const result = {
          price: Math.round(pricePerOunce * 100) / 100,
          currency: 'USD',
          timestamp: new Date(),
        };

        this.logger.log(`Metals API gold price fetched: ${result.price} ${result.currency}`);
        return result;
      }

      this.logger.debug('Metals API: Invalid response structure');
      return null;
    } catch (error) {
      this.logger.debug(`Metals API failed: ${error.message}`);
      return null;
    }
  }
}