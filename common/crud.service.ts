
import { Repository, Brackets, SelectQueryBuilder } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

export interface CustomPaginatedResponse<T> {
  total_records: number;
  current_page: number;
  per_page: number;
  records: T[];
}

type Filters = Record<string, any>;
type Paginated<T> = {
  total_records: number;
  current_page: number;
  per_page: number;
  records: T[];
};

export class CRUD {
  static async findAll<T>(repository: Repository<T>, entityName: string, search?: string, page: any = 1, limit: any = 10, sortBy?: string, sortOrder: 'ASC' | 'DESC' = 'DESC', relations: string[] = [], searchFields: string[] = [], filters?: Filters): Promise<Paginated<T>> {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;

    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
      throw new BadRequestException('Pagination parameters must be valid numbers greater than 0.');
    }
    if (!['ASC', 'DESC'].includes(sortOrder)) {
      throw new BadRequestException("Sort order must be either 'ASC' or 'DESC'.");
    }

    const skip = (pageNumber - 1) * limitNumber;
    const qb = repository.createQueryBuilder(entityName).skip(skip).take(limitNumber);

    // ---------- helpers ----------
    const meta = repository.metadata;

    // propertyName -> column metadata
    const colByProp = new Map(meta.columns.map(c => [c.propertyName, c]));
    // databaseName -> column metadata
    const colByDb = new Map(meta.columns.map(c => [c.databaseName, c]));

    const joined = new Set<string>(); // relation aliases we already joined

    // is the first N segments a valid relation path starting from current metadata?
    function isRelationPath(path: string): boolean {
      const parts = path.split('.');
      let currentMeta: any = meta;
      for (const part of parts) {
        const rel = currentMeta.relations.find(r => r.propertyName === part || r.relationPath === part);
        if (!rel) return false;
        currentMeta = rel.inverseEntityMetadata;
      }
      return true;
    }

    // join relation path ONLY if it’s a real path (e.g., 'owner' or 'owner.profile')
    function ensureJoin(path: string) {
      if (!path || !isRelationPath(path)) return; // <- do nothing for scalar columns like 'created_at'
      const parts = path.split('.');
      let currentAlias = entityName;
      let aliasSoFar = '';
      let currentMeta = meta;

      for (const part of parts) {
        const rel = currentMeta.relations.find((r: any) => r.propertyName === part || r.relationPath === part);
        if (!rel) break;
        aliasSoFar = aliasSoFar ? `${aliasSoFar}.${part}` : part;
        if (!joined.has(aliasSoFar)) {
          qb.leftJoin(`${currentAlias}.${part}`, aliasSoFar);
          joined.add(aliasSoFar);
        }
        currentAlias = aliasSoFar;
        currentMeta = rel.inverseEntityMetadata;
      }
    }

    // resolve base-entity column name (accepts 'created_at' or 'createdAt')
    function resolveOwnColumnName(field: string): string | null {
      const col = colByProp.get(field) || colByDb.get(field) || (field === 'created_at' ? colByProp.get('createdAt') : null) || (field === 'createdAt' ? colByDb.get('created_at') : null);
      return col ? col.databaseName : null;
    }

    function qualifyField(fieldPath: string): string {
      if (!fieldPath.includes('.')) {
        const dbName = resolveOwnColumnName(fieldPath) || fieldPath;
        return `${entityName}.${dbName}`;
      }
      const parts = fieldPath.split('.');
      const relationPath = parts.slice(0, -1).join('.');
      const last = parts[parts.length - 1];
      ensureJoin(relationPath); // only joins if real relation path
      const alias = isRelationPath(relationPath) ? relationPath : entityName;
      return `${alias}.${last}`;
    }

    function flatten(obj: any, prefix = ''): Record<string, any> {
      const out: Record<string, any> = {};
      if (!obj || typeof obj !== 'object') return out;
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
        else out[key] = v;
      }
      return out;
    }

    // join & select requested relations first
    if (relations?.length) {
      const invalid = relations.filter(r => !meta.relations.some((rel: any) => rel.propertyName === r || rel.relationPath === r));
      if (invalid.length) throw new BadRequestException(`Invalid relations: ${invalid.join(', ')}`);
      for (const rel of relations) {
        qb.leftJoinAndSelect(`${entityName}.${rel}`, rel);
        joined.add(rel);
      }
    }

    // ---------- filters (with operators) ----------
    // supports: = (default), like, ilike, gt, gte, lt, lte, ne, isnull
    function applyFilter(key: string, value: any) {
      let base = key;
      let op: string | null = null;
      const knownOps = ['like', 'ilike', 'gt', 'gte', 'lt', 'lte', 'ne', 'isnull'];

      const i = key.lastIndexOf('.');
      if (i > -1) {
        const maybeOp = key.slice(i + 1);
        if (knownOps.includes(maybeOp)) {
          base = key.slice(0, i);
          op = maybeOp;
        }
      }

      // special literal for null
      if (value === '__NULL__') {
        op = 'isnull';
        value = true;
      }

      const qualified = qualifyField(base);
      const param = key.replace(/\./g, '_');

      switch (op) {
        case 'like':
          qb.andWhere(`${qualified} LIKE :${param}`, { [param]: `%${value}%` });
          break;
        case 'ilike':
          qb.andWhere(`${qualified} ILIKE :${param}`, { [param]: `%${value}%` });
          break;
        case 'gt':
          qb.andWhere(`${qualified} > :${param}`, { [param]: value });
          break;
        case 'gte':
          qb.andWhere(`${qualified} >= :${param}`, { [param]: value });
          break;
        case 'lt':
          qb.andWhere(`${qualified} < :${param}`, { [param]: value });
          break;
        case 'lte':
          qb.andWhere(`${qualified} <= :${param}`, { [param]: value });
          break;
        case 'ne':
          qb.andWhere(`${qualified} <> :${param}`, { [param]: value });
          break;
        case 'isnull':
          if (value === true || value === 'true' || value === 1 || value === '1') {
            qb.andWhere(`${qualified} IS NULL`);
          } else {
            qb.andWhere(`${qualified} IS NOT NULL`);
          }
          break;
        default:
          if (value !== null && value !== undefined && value !== '') {
            qb.andWhere(`${qualified} = :${param}`, { [param]: value });
          }
      }
    }

    if (filters && Object.keys(filters).length) {
      const flat = flatten(filters);

      // group ops per base field to allow BETWEEN (gte + lte)
      const grouped: Record<string, Record<string, any>> = {};
      for (const [k, v] of Object.entries(flat)) {
        const j = k.lastIndexOf('.');
        const base = j > -1 ? k.slice(0, j) : k;
        const op = j > -1 ? k.slice(j + 1) : 'eq';
        if (!grouped[base]) grouped[base] = {};
        grouped[base][op] = v;
      }

      for (const [base, ops] of Object.entries(grouped)) {
        if (ops.gte !== undefined && ops.lte !== undefined) {
          const qualified = qualifyField(base);
          const pFrom = base.replace(/\./g, '_') + '_from';
          const pTo = base.replace(/\./g, '_') + '_to';
          qb.andWhere(`${qualified} BETWEEN :${pFrom} AND :${pTo}`, {
            [pFrom]: ops.gte,
            [pTo]: ops.lte,
          });
          for (const [op, val] of Object.entries(ops)) {
            if (op === 'gte' || op === 'lte') continue;
            if (op === 'eq') applyFilter(base, val);
            else applyFilter(`${base}.${op}`, val);
          }
        } else {
          for (const [op, val] of Object.entries(ops)) {
            if (op === 'eq') applyFilter(base, val);
            else applyFilter(`${base}.${op}`, val);
          }
        }
      }
    }

    // ---------- search ----------
    if (search && searchFields?.length) {
      qb.andWhere(
        new Brackets(qb2 => {
          for (const field of searchFields) {
            if (field.includes('.')) {
              // joined search: e.g. 'owner.username'
              const qualified = qualifyField(field);
              qb2.orWhere(`LOWER(${qualified}) LIKE LOWER(:search)`, { search: `%${search}%` });
              continue;
            }
            const dbName = resolveOwnColumnName(field);
            if (!dbName) continue;
            const qualified = `${entityName}.${dbName}`;
            qb2.orWhere(`LOWER(${qualified}) LIKE LOWER(:search)`, { search: `%${search}%` });
          }
        }),
      );
    }

    // ---------- sorting ----------
    if (sortBy?.includes('.')) {
      // e.g., sortBy=owner.username
      const qualified = qualifyField(sortBy);
      qb.orderBy(qualified, sortOrder);
    } else {
      const field = sortBy || 'created_at';
      const dbName = resolveOwnColumnName(field);
      if (!dbName) {
        const available = meta.columns.map(c => c.propertyName).join(', ');
        throw new BadRequestException(`Invalid sortBy field: '${field}'. Available: ${available}`);
      }
      qb.orderBy(`${entityName}.${dbName}`, sortOrder);
    }

    // ---------- result ----------
    const [data, total] = await qb.getManyAndCount();
    return {
      total_records: total,
      current_page: pageNumber,
      per_page: limitNumber,
      records: data,
    };
  }

  static joinNestedRelations<T>(qb: SelectQueryBuilder<T>, repository: Repository<T>, rootAlias: string, relations: string[] = []): any {
    const addedAliases = new Set<string>();
    const aliasMap: any = new Map();

    function validatePathAndReturnJoins(path: string) {
      const segments = path.split('.');
      let currentMeta = repository.metadata;
      let parentAlias = rootAlias;
      const steps: { joinPath: string; alias: string; relationPath: string }[] = [];
      let aliasPath = rootAlias;
      let relationPath = '';

      for (const seg of segments) {
        const relMeta = currentMeta.relations.find(r => r.propertyName === seg);
        if (!relMeta) {
          throw new BadRequestException(`Invalid relation segment '${seg}' in '${path}'`);
        }
        const joinPath = `${parentAlias}.${seg}`;
        const alias = (aliasPath + '_' + seg).replace(/\./g, '_'); // e.g., product_stock, product_stock_branch
        relationPath = relationPath ? `${relationPath}.${seg}` : seg;

        steps.push({ joinPath, alias, relationPath });

        parentAlias = alias;
        aliasPath = alias;
        currentMeta = relMeta.inverseEntityMetadata;
      }
      return steps;
    }

    for (const path of relations) {
      if (!path) continue;
      const steps = validatePathAndReturnJoins(path);
      for (const { joinPath, alias, relationPath } of steps) {
        if (!addedAliases.has(alias)) {
          qb.leftJoinAndSelect(joinPath, alias);
          addedAliases.add(alias);
        }
        aliasMap.set(relationPath, alias);
      }
    }

    return aliasMap;
  }

  static async findAll2<T>(repository: Repository<T>, entityName: string, search?: string, page: any = 1, limit: any = 10, sortBy?: string, sortOrder: 'ASC' | 'DESC' = 'DESC', relations: string[] = [], searchFields: string[] = [], filters?: Record<string, any>): Promise<CustomPaginatedResponse<T>> {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;

    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
      throw new BadRequestException('Pagination parameters must be valid numbers greater than 0.');
    }
    if (!['ASC', 'DESC'].includes(sortOrder)) {
      throw new BadRequestException("Sort order must be either 'ASC' or 'DESC'.");
    }

    const skip = (pageNumber - 1) * limitNumber;
    const qb = repository.createQueryBuilder(entityName).skip(skip).take(limitNumber);

    // --- helpers/meta ---
    const meta = repository.metadata;
    const colByProp = new Map(meta.columns.map(c => [c.propertyName, c]));
    const colByDb = new Map(meta.columns.map(c => [c.databaseName, c]));

    function resolveOwnColumnName(field: string): string | null {
      const col = colByProp.get(field) || colByDb.get(field) || (field === 'created_at' ? colByProp.get('createdAt') : null) || (field === 'createdAt' ? colByDb.get('created_at') : null);
      return col ? col.databaseName : null;
    }

    function flatten(obj: any, prefix = ''): Record<string, any> {
      const out: Record<string, any> = {};
      if (!obj || typeof obj !== 'object') return out;
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
        else out[key] = v;
      }
      return out;
    }

    // --- compute relation paths needed by filters/sort ---
    const relationPathsFromFilters = new Set<string>();
    const flatFilters = filters && Object.keys(filters).length ? flatten(filters) : {};
    for (const key of Object.keys(flatFilters)) {
      if (key.includes('.')) {
        const parts = key.split('.');
        if (parts.length > 1) {
          const relPath = parts.slice(0, -1).join('.'); // e.g., 'stock.branch'
          relationPathsFromFilters.add(relPath);
        }
      }
    }
    if (sortBy?.includes('.')) {
      const parts = sortBy.split('.');
      if (parts.length > 1) {
        relationPathsFromFilters.add(parts.slice(0, -1).join('.'));
      }
    }

    // --- join relations FIRST (requested + implied by filters/sort) ---
    const relationsToJoin = Array.from(new Set([...(relations || []), ...relationPathsFromFilters]));
    const aliasMap = CRUD.joinNestedRelations(qb, repository, entityName, relationsToJoin);

    // qualify field (base or nested via aliasMap)
    function qualifyField(fieldPath: string): string {
      if (!fieldPath.includes('.')) {
        const dbName = resolveOwnColumnName(fieldPath) || fieldPath;
        return `${entityName}.${dbName}`;
      }
      const parts = fieldPath.split('.');
      const relationPath = parts.slice(0, -1).join('.');
      const last = parts[parts.length - 1];
      const alias = aliasMap.get(relationPath);
      if (!alias) {
        // not joined? then it’s invalid relation path
        throw new BadRequestException(`Missing join for relation path '${relationPath}' (from '${fieldPath}')`);
      }
      return `${alias}.${last}`;
    }

    // --- filters (supports ops) ---
    function applyFilter(key: string, value: any) {
      let base = key;
      let op: string | null = null;
      const knownOps = ['like', 'ilike', 'gt', 'gte', 'lt', 'lte', 'ne', 'isnull'];

      const i = key.lastIndexOf('.');
      if (i > -1) {
        const maybeOp = key.slice(i + 1);
        if (knownOps.includes(maybeOp)) {
          base = key.slice(0, i);
          op = maybeOp;
        }
      }

      if (value === '__NULL__') {
        op = 'isnull';
        value = true;
      }

      const qualified = qualifyField(base);
      const param = key.replace(/\./g, '_');

      switch (op) {
        case 'like':
          qb.andWhere(`${qualified} LIKE :${param}`, { [param]: `%${value}%` });
          break;
        case 'ilike':
          qb.andWhere(`${qualified} ILIKE :${param}`, { [param]: `%${value}%` });
          break;
        case 'gt':
          qb.andWhere(`${qualified} > :${param}`, { [param]: value });
          break;
        case 'gte':
          qb.andWhere(`${qualified} >= :${param}`, { [param]: value });
          break;
        case 'lt':
          qb.andWhere(`${qualified} < :${param}`, { [param]: value });
          break;
        case 'lte':
          qb.andWhere(`${qualified} <= :${param}`, { [param]: value });
          break;
        case 'ne':
          qb.andWhere(`${qualified} <> :${param}`, { [param]: value });
          break;
        case 'isnull':
          if (value === true || value === 'true' || value === 1 || value === '1') qb.andWhere(`${qualified} IS NULL`);
          else qb.andWhere(`${qualified} IS NOT NULL`);
          break;
        default:
          if (value !== null && value !== undefined && value !== '') {
            qb.andWhere(`${qualified} = :${param}`, { [param]: value });
          }
      }
    }

    if (filters && Object.keys(filters).length) {
      const flat = flatFilters; // already flattened above
      // group ops per base field to allow BETWEEN (gte + lte)
      const grouped: Record<string, Record<string, any>> = {};
      for (const [k, v] of Object.entries(flat)) {
        const j = k.lastIndexOf('.');
        const base = j > -1 ? k.slice(0, j) : k;
        const op = j > -1 ? k.slice(j + 1) : 'eq';
        if (!grouped[base]) grouped[base] = {};
        grouped[base][op] = v;
      }

      for (const [base, ops] of Object.entries(grouped)) {
        if (ops.gte !== undefined && ops.lte !== undefined) {
          const qualified = qualifyField(base);
          const pFrom = base.replace(/\./g, '_') + '_from';
          const pTo = base.replace(/\./g, '_') + '_to';
          qb.andWhere(`${qualified} BETWEEN :${pFrom} AND :${pTo}`, {
            [pFrom]: ops.gte,
            [pTo]: ops.lte,
          });
          for (const [op, val] of Object.entries(ops)) {
            if (op === 'gte' || op === 'lte') continue;
            if (op === 'eq') applyFilter(base, val);
            else applyFilter(`${base}.${op}`, val);
          }
        } else {
          for (const [op, val] of Object.entries(ops)) {
            if (op === 'eq') applyFilter(base, val);
            else applyFilter(`${base}.${op}`, val);
          }
        }
      }
    }

    // --- search ---
    if (search && searchFields?.length) {
      qb.andWhere(
        new Brackets(qb2 => {
          for (const field of searchFields) {
            try {
              const qualified = qualifyField(field);
              // We cast to text for robustness; adjust if you want type-aware like earlier logic
              qb2.orWhere(`LOWER(${qualified}::text) LIKE LOWER(:search)`, { search: `%${search}%` });
            } catch {
              // ignore fields that aren't valid in this entity (e.g., misconfigured field)
            }
          }
        }),
      );
    }

    // --- sorting (supports nested) ---
    if (sortBy?.includes('.')) {
      const qualified = qualifyField(sortBy);
      qb.orderBy(qualified, sortOrder);
    } else {
      const field = sortBy || 'created_at';
      const dbName = resolveOwnColumnName(field);
      if (!dbName) {
        const available = meta.columns.map(c => c.propertyName).join(', ');
        throw new BadRequestException(`Invalid sortBy field: '${field}'. Available: ${available}`);
      }
      qb.orderBy(`${entityName}.${dbName}`, sortOrder);
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      total_records: total,
      current_page: pageNumber,
      per_page: limitNumber,
      records: data,
    };
  }
  static async delete<T>(repository: Repository<T>, entityName: string, id: number | string): Promise<{ message: string }> {
    const entity = await repository.findOne({ where: { id } as any });

    if (!entity) {
      throw new BadRequestException(`${entityName} with ID ${id} not found.`);
    }

    await repository.delete(id);

    return {
      message: `${entityName} deleted successfully.`,
    };
  }

  static async softDelete<T>(repository: Repository<T>, entityName: string, id: number | string): Promise<{ message: string }> {
    const entity = await repository.findOne({ where: { id } as any });

    if (!entity) {
      throw new BadRequestException(`${entityName} with ID ${id} not found.`);
    }

    await repository.softDelete(id);

    return {
      message: `${entityName} soft-deleted successfully.`,
    };
  }

  static async findOne<T>(repository: Repository<T>, entityName: string, id: number | string, relations?: string[]): Promise<T> {
    if (relations?.length > 0) {
      const invalidRelations = relations.filter(relation => !repository.metadata.relations.some(rel => rel.propertyName === relation));
      if (invalidRelations.length > 0) {
        throw new BadRequestException(`Invalid relations: ${invalidRelations.join(', ')}`);
      }
    }

    const entity = await repository.findOne({
      where: { id } as any,
      relations: relations || [],
    });

    if (!entity) {
      throw new BadRequestException(`${entityName} with ID ${id} not found.`);
    }

    return entity;
  }

}
