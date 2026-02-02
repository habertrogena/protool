import { Module } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { GoogleMapsService } from './google-maps.service';

import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [LeadsModule],
  providers: [ScrapingService, GoogleMapsService],
})
export class ScrapingModule {}
