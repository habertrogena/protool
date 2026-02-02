import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadEnrichmentService } from './leadEnrichment.service';

@Module({
  providers: [LeadsService, LeadEnrichmentService],
  exports: [LeadsService, LeadEnrichmentService],
})
export class LeadsModule {}
