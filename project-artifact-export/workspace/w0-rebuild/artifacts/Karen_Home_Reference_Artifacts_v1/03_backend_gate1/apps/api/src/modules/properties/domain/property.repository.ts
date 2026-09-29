export interface PropertyRecord {id:string;propertyTypeId:string;areaTotalM2:number;rooms:number|null;status:'draft'|'active'|'inactive'|'sold'|'rented'|'archived'|'deleted';}
export abstract class PropertyRepository {abstract insert(property:PropertyRecord):Promise<void>;abstract findById(id:string):Promise<PropertyRecord|null>;}
