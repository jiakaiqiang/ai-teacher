import { Module } from '@nestjs/common';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { AnomalyDetectorController } from './anomaly-detector.controller';

@Module({
  providers: [AnomalyDetectorService],
  controllers: [AnomalyDetectorController]
})
export class AnomalyDetectorModule {}
