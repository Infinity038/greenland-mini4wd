export declare const HANDOFF_ISSUER: string;
export declare const HANDOFF_AUDIENCE: string;
export declare function issueHandoffTicket(args: {
  memberId: string;
  authorized: boolean;
  secret: Buffer;
  nowSeconds: number;
  nonce?: string;
  ttlSeconds?: number;
}): string;
export declare function verifyHandoffTicket(token: string, args: {
  secret: Buffer; nowSeconds: number;
}): { accepted: boolean; code: string; memberId?: string; expiresAt?: number; nonceHash?: string };
