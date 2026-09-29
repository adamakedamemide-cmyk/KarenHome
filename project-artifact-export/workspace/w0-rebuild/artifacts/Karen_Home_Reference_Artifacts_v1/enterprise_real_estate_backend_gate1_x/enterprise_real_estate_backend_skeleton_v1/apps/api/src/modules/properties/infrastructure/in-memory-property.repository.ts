import { PropertyRecord, PropertyRepository } from '../domain/property.repository';
export class InMemoryPropertyRepository extends PropertyRepository {
  private readonly rows=new Map<string,PropertyRecord>();
  async insert(property:PropertyRecord){this.rows.set(property.id,property);}
  async findById(id:string){return this.rows.get(id)??null;}
}
