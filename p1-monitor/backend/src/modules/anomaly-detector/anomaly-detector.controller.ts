import { Controller,Get,Param } from '@nestjs/common';
import {MetricsService} from '../metrics/metrics.service'

@Controller('anomaly-detector')
export class AnomalyDetectorController {
    constructor(
        private readonly metricsService: MetricsService
    ) {}

 @Get('anomaly/:serverId')
async generateAnomaly(@Param('serverId') serverId: string) {
  return this.metricsService.generateAnomalyData(serverId);
}


}
