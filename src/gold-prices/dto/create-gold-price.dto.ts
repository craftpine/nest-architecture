export class CreateGoldPriceDto {
  type: string; // 'vietnam' or 'world'
  goldType: string; // 'SJC', 'PNJ', 'DOJI', 'spot' etc.
  buyPrice?: number;
  sellPrice?: number;
  currency: string; // VND, USD
  source: string; // API source name
  sourceUrl?: string; // URL nguồn gốc
  timestamp: Date; // Thời gian báo giá
}