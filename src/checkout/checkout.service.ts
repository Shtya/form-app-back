// --- File: checkout\checkout.service.ts ---
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Checkout } from './checkout.entity';
import { CreateCheckoutDto, UpdateCheckoutDto } from './checkout.dto';

@Injectable()
export class CheckoutsService {
  constructor(
    @InjectRepository(Checkout)
    public readonly repo: Repository<Checkout>,
  ) {}

  async create(dto: CreateCheckoutDto): Promise<Checkout> {
    // Normalize digits on phone (in case client missed it)
    dto.phone = dto.phone.replace(/\D/g, '');
    
    // Generate tracking ID
    const trackingId = this.generateTrackingId();
    
    const entity:any = this.repo.create({
      ...dto,
      trackingId
    } as any);
    
    return this.repo.save(entity);
  }

  async findAll(page = 1, limit = 20, where?: FindOptionsWhere<Checkout>): Promise<{ data: Checkout[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.repo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Checkout> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Checkout not found');
    return row;
  }

  async findByTrackingId(trackingId: string): Promise<Checkout> {
    const row = await this.repo.findOne({ where: { trackingId } });
    if (!row) throw new NotFoundException('Checkout not found with this tracking ID');
    return row;
  }

  async update(id: string, dto: UpdateCheckoutDto): Promise<Checkout> {
    const row = await this.findOne(id);
    Object.assign(row, dto);
    return this.repo.save(row);
  }

  async setStatus(id: string, status: 'pending' | 'verified' | 'rejected', notes?: string): Promise<Checkout> {
    const row = await this.findOne(id);
    row.status = status as any;
    if (typeof notes === 'string') row.notes = notes;
    return this.repo.save(row);
  }

  async remove(id: string): Promise<void> {
    const row = await this.findOne(id);
    await this.repo.remove(row);
  }

  private generateTrackingId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TRK-${timestamp}-${random}`;
  }
}