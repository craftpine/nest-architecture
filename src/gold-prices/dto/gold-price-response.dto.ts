export class GoldPriceResponseDto {
  id: number;
  type: string;
  goldType: string;
  buyPrice?: number;
  sellPrice?: number;
  currency: string;
  source: string;
  sourceUrl?: string;
  timestamp: string; // ISO string format
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
}