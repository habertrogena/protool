import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaClient) {}

  async saveLead(data: any) {
    // If phone is empty, generate a unique key
    const uniquePhone =
      data.phone?.trim() ||
      `NO_PHONE_${data.name.replace(/\s/g, '_')}_${Date.now()}`;

    // First, try to find an existing lead by phone
    let lead = await this.prisma.lead.findUnique({
      where: { phone: uniquePhone },
    });

    if (lead) {
      // Already exists → update if needed
      lead = await this.prisma.lead.update({
        where: { id: lead.id },
        data,
      });
    } else {
      // Create new lead
      lead = await this.prisma.lead.create({
        data: {
          ...data,
          phone: uniquePhone,
        },
      });
    }

    return lead;
  }

  async updateLead(id: number, data: Partial<any>) {
    const updateLead = await this.prisma.lead.update({
      where: { id },
      data,
    });
    return updateLead;
  }

  async getAllLeads() {
    const getAllLeads = await this.prisma.lead.findMany();
    return getAllLeads;
  }
}
