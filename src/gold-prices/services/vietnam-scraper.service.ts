import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

interface VNGoldPrice {
  goldType: string;
  buyPrice?: number;
  sellPrice?: number;
  source: string;
  sourceUrl: string;
  timestamp: Date;
}

@Injectable()
export class VietnamScraperService {
  private readonly logger = new Logger(VietnamScraperService.name);

  constructor(private readonly httpService: HttpService) {}

  async scrapeSJCPrices(): Promise<VNGoldPrice[]> {
    let browser;
    try {
      this.logger.log('Fetching SJC gold prices using Puppeteer');

      // Launch browser with headless mode
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.goto('https://sjc.com.vn/gia-vang-online', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for table to be populated with data
      await page.waitForSelector('table.sjc-table-show-price-online tbody tr', {
        timeout: 10000,
      });

      // Extract data from the page
      const prices = await page.evaluate(() => {
        const rows = document.querySelectorAll('table.sjc-table-show-price-online tbody tr');
        const data: any[] = [];

        rows.forEach((row, index) => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            const goldType = cells[0]?.textContent?.trim();
            const buyPrice = cells[1]?.textContent?.trim();
            const sellPrice = cells[2]?.textContent?.trim();

            if (goldType && buyPrice && sellPrice) {
              data.push({
                goldType,
                buyPrice,
                sellPrice,
              });
            }
          }
        });

        return data;
      });

      await browser.close();

      // Parse and convert to VNGoldPrice format
      const vnGoldPrices: VNGoldPrice[] = [];
      for (const item of prices) {
        const buyStr = item.buyPrice.replace(/[.,]/g, '');
        const sellStr = item.sellPrice.replace(/[.,]/g, '');

        if (buyStr && sellStr) {
          // Multiply by 1000 since prices are displayed in thousands of VND
          const buyPrice = parseInt(buyStr, 10) * 1000;
          const sellPrice = parseInt(sellStr, 10) * 1000;

          if (!isNaN(buyPrice) && !isNaN(sellPrice) && buyPrice > 0 && sellPrice > 0) {
            vnGoldPrices.push({
              goldType: `SJC_${item.goldType.replace(/\s+/g, '_')}`,
              buyPrice,
              sellPrice,
              source: 'sjc-scraping',
              sourceUrl: 'https://sjc.com.vn/gia-vang-online',
              timestamp: new Date(),
            });
          }
        }
      }

      this.logger.log(`Scraped ${vnGoldPrices.length} SJC prices using Puppeteer`);
      return vnGoldPrices;
    } catch (error) {
      this.logger.error(`Failed to scrape SJC prices: ${error.message}`, error.stack);
      if (browser) {
        await browser.close();
      }
      return [];
    }
  }

  async scrapePNJPrices(): Promise<VNGoldPrice[]> {
    let browser;
    try {
      this.logger.log('Fetching PNJ gold prices using Puppeteer');

      // Launch browser with headless mode
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.goto('https://www.pnj.com.vn/site/gia-vang', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for price table/content to be populated
      await page.waitForSelector('table, [class*="price"], [class*="bang"]', {
        timeout: 10000,
      });

      // Extract data from the page
      const prices = await page.evaluate(() => {
        const data: any[] = [];

        // Try to find table with prices
        const tables = document.querySelectorAll('table');
        tables.forEach((table) => {
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
              const goldType = cells[0]?.textContent?.trim();
              const buyPrice = cells[1]?.textContent?.trim();
              const sellPrice = cells[2]?.textContent?.trim();

              if (goldType && buyPrice && sellPrice) {
                data.push({
                  goldType,
                  buyPrice,
                  sellPrice,
                });
              }
            }
          });
        });

        // If no table data found, try looking for price containers
        if (data.length === 0) {
          const priceContainers = document.querySelectorAll('[class*="price"], [class*="bang"]');
          priceContainers.forEach((container) => {
            const text = container.textContent || '';

            // Look for patterns: "Vàng XXXX ... number ... number"
            const typeMatch = text.match(/Vàng\s+([^\n\d]+)/i);
            const prices = text.match(/[\d.,]+/g);

            if (typeMatch && prices && prices.length >= 2) {
              data.push({
                goldType: typeMatch[1].trim(),
                buyPrice: prices[0],
                sellPrice: prices[1],
              });
            }
          });
        }

        return data;
      });

      await browser.close();

      // Parse and convert to VNGoldPrice format
      const vnGoldPrices: VNGoldPrice[] = [];
      const seen = new Set<string>();

      for (const item of prices) {
        const buyStr = item.buyPrice.replace(/[.,]/g, '');
        const sellStr = item.sellPrice.replace(/[.,]/g, '');

        if (buyStr && sellStr) {
          // Multiply by 1000 since prices are displayed in thousands of VND
          const buyPrice = parseInt(buyStr, 10) * 1000;
          const sellPrice = parseInt(sellStr, 10) * 1000;

          // Check if valid prices and not duplicated
          const key = `${item.goldType}-${buyPrice}-${sellPrice}`;
          if (
            !isNaN(buyPrice) &&
            !isNaN(sellPrice) &&
            buyPrice > 0 &&
            sellPrice > 0 &&
            !seen.has(key)
          ) {
            seen.add(key);
            vnGoldPrices.push({
              goldType: `PNJ_${item.goldType.replace(/\s+/g, '_')}`,
              buyPrice,
              sellPrice,
              source: 'pnj-scraping',
              sourceUrl: 'https://www.pnj.com.vn/site/gia-vang',
              timestamp: new Date(),
            });
          }
        }
      }

      this.logger.log(`Scraped ${vnGoldPrices.length} PNJ prices using Puppeteer`);
      return vnGoldPrices;
    } catch (error) {
      this.logger.error(`Failed to scrape PNJ prices: ${error.message}`, error.stack);
      if (browser) {
        await browser.close();
      }
      return [];
    }
  }

  async scrapeBaoTinMinhChauPrices(): Promise<VNGoldPrice[]> {
    let browser;
    try {
      this.logger.log('Fetching Bảo Tín Minh Châu gold prices using Puppeteer');

      // Launch browser with headless mode
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.goto('https://btmc.vn/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for price table/content to be populated
      await page.waitForSelector('table, [class*="price"], [class*="bang"]', {
        timeout: 10000,
      });

      // Extract data from the page
      const prices = await page.evaluate(() => {
        const data: any[] = [];

        // Try to find table with prices
        const tables = document.querySelectorAll('table');
        tables.forEach((table) => {
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
              const goldType = cells[0]?.textContent?.trim();
              const buyPrice = cells[1]?.textContent?.trim();
              const sellPrice = cells[2]?.textContent?.trim();

              if (goldType && buyPrice && sellPrice) {
                data.push({
                  goldType,
                  buyPrice,
                  sellPrice,
                });
              }
            }
          });
        });

        // If no table data found, try looking for price containers
        if (data.length === 0) {
          const priceContainers = document.querySelectorAll('[class*="price"], [class*="bang"]');
          priceContainers.forEach((container) => {
            const text = container.textContent || '';

            // Look for patterns: "Vàng XXXX ... number ... number"
            const typeMatch = text.match(/Vàng\s+([^\n\d]+)/i);
            const prices = text.match(/[\d.,]+/g);

            if (typeMatch && prices && prices.length >= 2) {
              data.push({
                goldType: typeMatch[1].trim(),
                buyPrice: prices[0],
                sellPrice: prices[1],
              });
            }
          });
        }

        return data;
      });

      await browser.close();

      // Parse and convert to VNGoldPrice format
      const vnGoldPrices: VNGoldPrice[] = [];
      const seen = new Set<string>();

      for (const item of prices) {
        const buyStr = item.buyPrice.replace(/[.,]/g, '');
        const sellStr = item.sellPrice.replace(/[.,]/g, '');

        if (buyStr && sellStr) {
          // Multiply by 1000 since prices are displayed in thousands of VND
          const buyPrice = parseInt(buyStr, 10) * 1000;
          const sellPrice = parseInt(sellStr, 10) * 1000;

          // Check if valid prices and not duplicated
          const key = `${item.goldType}-${buyPrice}-${sellPrice}`;
          if (
            !isNaN(buyPrice) &&
            !isNaN(sellPrice) &&
            buyPrice > 0 &&
            sellPrice > 0 &&
            !seen.has(key)
          ) {
            seen.add(key);
            vnGoldPrices.push({
              goldType: `BTMC_${item.goldType.replace(/\s+/g, '_')}`,
              buyPrice,
              sellPrice,
              source: 'btmc-scraping',
              sourceUrl: 'https://btmc.vn/',
              timestamp: new Date(),
            });
          }
        }
      }

      this.logger.log(`Scraped ${vnGoldPrices.length} BTMC prices using Puppeteer`);
      return vnGoldPrices;
    } catch (error) {
      this.logger.error(`Failed to scrape BTMC prices: ${error.message}`, error.stack);
      if (browser) {
        await browser.close();
      }
      return [];
    }
  }

  async scrapeBaoTinManhHaiPrices(): Promise<VNGoldPrice[]> {
    let browser;
    try {
      this.logger.log('Fetching Bảo Tín Mạnh Hải gold prices using Puppeteer');

      // Launch browser with headless mode
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.goto('https://baotinmanhhai.vn/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for price table/content to be populated
      await page.waitForSelector('table, [class*="price"], [class*="bang"]', {
        timeout: 10000,
      });

      // Extract data from the page
      const prices = await page.evaluate(() => {
        const data: any[] = [];

        // Try to find table with prices
        const tables = document.querySelectorAll('table');
        tables.forEach((table) => {
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
              const goldType = cells[0]?.textContent?.trim();
              const buyPrice = cells[1]?.textContent?.trim();
              const sellPrice = cells[2]?.textContent?.trim();

              if (goldType && buyPrice && sellPrice) {
                data.push({
                  goldType,
                  buyPrice,
                  sellPrice,
                });
              }
            }
          });
        });

        // If no table data found, try looking for price containers
        if (data.length === 0) {
          const priceContainers = document.querySelectorAll('[class*="price"], [class*="bang"]');
          priceContainers.forEach((container) => {
            const text = container.textContent || '';

            // Look for patterns: "Vàng XXXX ... number ... number"
            const typeMatch = text.match(/Vàng\s+([^\n\d]+)/i);
            const prices = text.match(/[\d.,]+/g);

            if (typeMatch && prices && prices.length >= 2) {
              data.push({
                goldType: typeMatch[1].trim(),
                buyPrice: prices[0],
                sellPrice: prices[1],
              });
            }
          });
        }

        return data;
      });

      await browser.close();

      // Parse and convert to VNGoldPrice format
      const vnGoldPrices: VNGoldPrice[] = [];
      const seen = new Set<string>();

      for (const item of prices) {
        const buyStr = item.buyPrice.replace(/[.,]/g, '');
        const sellStr = item.sellPrice.replace(/[.,]/g, '');

        if (buyStr && sellStr) {
          // Multiply by 1000 since prices are displayed in thousands of VND
          const buyPrice = parseInt(buyStr, 10) * 1000;
          const sellPrice = parseInt(sellStr, 10) * 1000;

          // Check if valid prices and not duplicated
          const key = `${item.goldType}-${buyPrice}-${sellPrice}`;
          if (
            !isNaN(buyPrice) &&
            !isNaN(sellPrice) &&
            buyPrice > 0 &&
            sellPrice > 0 &&
            !seen.has(key)
          ) {
            seen.add(key);
            vnGoldPrices.push({
              goldType: `BTMH_${item.goldType.replace(/\s+/g, '_')}`,
              buyPrice,
              sellPrice,
              source: 'btmh-scraping',
              sourceUrl: 'https://baotinmanhhai.vn/',
              timestamp: new Date(),
            });
          }
        }
      }

      this.logger.log(`Scraped ${vnGoldPrices.length} BTMH prices using Puppeteer`);
      return vnGoldPrices;
    } catch (error) {
      this.logger.error(`Failed to scrape BTMH prices: ${error.message}`, error.stack);
      if (browser) {
        await browser.close();
      }
      return [];
    }
  }

  async getAllVietnamPrices(): Promise<VNGoldPrice[]> {
    this.logger.log('Collecting all Vietnam gold prices');

    const [sjcPrices, pnjPrices, btmcPrices, btmhPrices] = await Promise.allSettled([
      this.scrapeSJCPrices(),
      this.scrapePNJPrices(),
      this.scrapeBaoTinMinhChauPrices(),
      this.scrapeBaoTinManhHaiPrices(),
    ]);

    const allPrices: VNGoldPrice[] = [];

    if (sjcPrices.status === 'fulfilled') {
      allPrices.push(...sjcPrices.value);
    } else {
      this.logger.warn('SJC scraping failed');
    }

    if (pnjPrices.status === 'fulfilled') {
      allPrices.push(...pnjPrices.value);
    } else {
      this.logger.warn('PNJ scraping failed');
    }

    if (btmcPrices.status === 'fulfilled') {
      allPrices.push(...btmcPrices.value);
    } else {
      this.logger.warn('Bảo Tín Minh Châu scraping failed');
    }

    if (btmhPrices.status === 'fulfilled') {
      allPrices.push(...btmhPrices.value);
    } else {
      this.logger.warn('Bảo Tín Mạnh Hải scraping failed');
    }

    this.logger.log(`Total Vietnam prices collected: ${allPrices.length}`);
    return allPrices;
  }
}