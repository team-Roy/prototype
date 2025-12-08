import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto, TagSearchQueryDto } from './dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  @Get('tags')
  async searchTags(@Query() query: TagSearchQueryDto) {
    return this.searchService.searchTags(query);
  }
}
