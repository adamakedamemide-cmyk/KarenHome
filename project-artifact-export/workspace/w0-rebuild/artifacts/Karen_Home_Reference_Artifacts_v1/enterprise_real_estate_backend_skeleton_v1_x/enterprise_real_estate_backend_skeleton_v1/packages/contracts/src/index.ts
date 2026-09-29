export type ListingStatus='draft'|'pending_moderation'|'published'|'paused'|'rejected'|'expired'|'sold'|'rented'|'archived'|'deleted';
export interface ApiErrorBody {error:{code:string;message:string;details:Array<{field?:string;reason:string;value?:unknown}>;requestId:string;};}
