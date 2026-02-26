export class GoldPrice {
  id: number;
  type: string; // 'vietnam' or 'world'
  goldType: string; // 'SJC', 'PNJ', 'DOJI', 'spot' etc.
  buyPrice?: number; // Mua vào
  sellPrice?: number; // Bán ra
  currency: string; // VND, USD
  source: string; // 'world-gold-service', 'sjc-scraping', 'pnj-scraping', 'btmc-scraping', 'btmh-scraping'
  sourceUrl?: string; // URL nguồn gốc
  timestamp: Date; // Thời gian báo giá
  createdAt: Date;
  updatedAt: Date;
}