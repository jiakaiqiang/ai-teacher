import { Controller, Get, Param, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('recent/:serverId')
  async getRecent(
    @Param('serverId') serverId: string,
    @Query('type') type: string,
    @Query('limit') limit?: string,
  ) {
    return this.metricsService.getRecentMetrics(
      serverId,
      type || 'cpu',
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('generate')
  async generate() {
    await this.metricsService.generateOnce();
    return { message: 'Metrics generated successfully' };
  }
}
