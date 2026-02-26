export class GoldPriceQueryDto {
  type?: string; // Filter by 'vietnam' or 'world'
  goldType?: string; // Filter by specific gold type
  currency?: string; // Filter by currency
  source?: string; // Filter by data source
  limit?: number; // Pagination limit
  offset?: number; // Pagination offset
  from?: string; // Start date for historical data (ISO string)
  to?: string; // End date for historical data (ISO string)
}