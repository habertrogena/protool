import { Injectable } from '@nestjs/common';
import { GoogleMapsService } from './google-maps.service';
import { LeadsService } from '../leads/leads.service';
import { LeadEnrichmentService } from '../leads/leadEnrichment.service';

@Injectable()
export class ScrapingService {
  constructor(
    private googleMaps: GoogleMapsService,
    private leadsService: LeadsService,
    private enrichmentService: LeadEnrichmentService,
  ) {}

  async run(query: string) {
    console.log(`\n🚀 ===== STARTING SCRAPING JOB =====`);
    console.log(`🔎 Query: "${query}"`);
    console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

    const leads = await this.googleMaps.scrape(query);
    console.log(`\n📊 Total leads scraped: ${leads.length}`);

    if (leads.length === 0) {
      console.log('❌ No leads found. Exiting.');
      return;
    }

    console.log(`\n💾 Processing ${leads.length} leads...\n`);

    let savedCount = 0;
    let enrichedCount = 0;
    let errorCount = 0;

    for (const [index, lead] of leads.entries()) {
      try {
        console.log(
          `[${index + 1}/${leads.length}] Processing: ${lead.name.substring(0, 50)}${lead.name.length > 50 ? '...' : ''}`,
        );

        // 1️⃣ Save raw lead
        const savedLead = await this.leadsService.saveLead({
          name: lead.name,
          phone: lead.phone || null,
          category: lead.category || null,
          website: lead.website || null,
          location: lead.location || null,
          source: 'GOOGLE_MAPS',
          score: 5,
        });

        savedCount++;
        console.log(`   ✅ Saved (ID: ${savedLead.id})`);

        // 2️⃣ Enrich only if website is missing
        if (!savedLead.website || savedLead.website === 'null') {
          const enrichedLead =
            await this.enrichmentService.enrichLead(savedLead);
          if (enrichedLead) {
            enrichedCount++;
            console.log(
              `   🔍 Enriched: ${enrichedLead.potentialCategory || 'No category'} (Score: ${enrichedLead.potentialScore || 'N/A'})`,
            );
          } else {
            console.log(`   ℹ️  No enrichment data found`);
          }
        } else {
          console.log(`   ℹ️  Already has website: ${savedLead.website}`);
        }

        console.log(''); // Empty line for readability
      } catch (error) {
        errorCount++;
        console.log(`   ❌ Error saving lead ${lead.name}: ${error.message}`);
        console.log(`   Stack: ${error.stack?.substring(0, 200)}...\n`);
      }
    }

    console.log(`\n🎉 ===== JOB COMPLETED =====`);
    console.log(`📊 Summary:`);
    console.log(`   Total leads scraped: ${leads.length}`);
    console.log(`   Successfully saved: ${savedCount}`);
    console.log(`   Enriched: ${enrichedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`⏰ Finished at: ${new Date().toISOString()}\n`);
  }
}
