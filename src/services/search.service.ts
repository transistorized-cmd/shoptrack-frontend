import { apiWithTimeout } from '@/services/api';
import type { SearchRequest, SearchResponse } from '@/types/search';

export class SearchService {
  /**
   * Perform search across receipts, items, and categories
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    try {
      const response = await apiWithTimeout.fast.get('/search', {
        params: {
          query: request.query,
          locale: request.locale,
          limit: request.limit
        }
      });

      return response.data;
    } catch (error) {
      console.error('Search failed:', error);
      throw new Error('Failed to perform search');
    }
  }

  /**
   * Perform search using POST method (for complex queries if needed)
   */
  async searchPost(request: SearchRequest): Promise<SearchResponse> {
    try {
      const response = await apiWithTimeout.fast.post('/search', request);
      return response.data;
    } catch (error) {
      console.error('Search POST failed:', error);
      throw new Error('Failed to perform search');
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();