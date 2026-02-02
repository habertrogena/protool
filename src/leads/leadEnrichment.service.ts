import { Injectable } from '@nestjs/common';
import { LeadsService } from '../leads/leads.service';
import axios from 'axios';

@Injectable()
export class LeadEnrichmentService {
  constructor(private leadsService: LeadsService) {}

  /**
   * Enrich a single lead with website info and opportunity scoring
   */
  async enrichLead(lead: any) {
    try {
      let website: string | null = null;

      // 1️⃣ Check if lead already has website
      if (lead.website) {
        website = lead.website;
      } else {
        // 2️⃣ Attempt simple Google Search check
        // Use a public API or simple fetch: example "http://www.google.com/search?q={name}+{location}"
        const query = encodeURIComponent(`${lead.name} ${lead.location}`);
        const searchUrl = `https://www.google.com/search?q=${query}`;

        // Optional: just check if page exists (simple MVP)
        const res = await axios.get(searchUrl, { timeout: 5000 });
        if (res.status === 200 && res.data.includes('http')) {
          website = 'Detected'; // For MVP, just mark as found
        }
      }

      // 3️⃣ Assign opportunity score
      let potentialScore = 5;
      let potentialCategory = 'Low';

      if (!website) {
        potentialScore = 10;
        potentialCategory = 'High'; // No website → prime target
      } else {
        potentialScore = 7;
        potentialCategory = 'Medium'; // Has website → maybe AI integration
      }

      // 4️⃣ Optional AI enrichment
      const aiNotes = website
        ? `Website exists; may need AI integration`
        : `No website; prime client for web + automation`;

      // 5️⃣ Save updates in DB
      await this.leadsService.updateLead(lead.id, {
        website: website || null,
        potentialScore,
        potentialCategory,
        aiNotes,
      });

      console.log(
        `[✅] Lead enriched: ${lead.name} → ${potentialCategory} (${potentialScore})`,
      );

      return { leadId: lead.id, potentialCategory, potentialScore };
    } catch (error) {
      console.error(`[❌] Error enriching lead ${lead.name}:`, error.message);
      return null;
    }
  }

  /**
   * Enrich all leads in DB
   */
  async enrichAllLeads() {
    const allLeads = await this.leadsService.getAllLeads();
    for (const lead of allLeads) {
      await this.enrichLead(lead);
    }
    console.log('🎉 All leads enriched');
  }
}
