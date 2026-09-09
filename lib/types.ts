export type Face = "front" | "back" | "left" | "right";
export type ApproachPhase = "idle" | "approaching" | "focused" | "returning";
export type SpotStatus = "available" | "reserved" | "sold";
export type PaymentNetwork = "sinpe" | "evm" | "stellar" | "solana";
export type Locale = "es" | "en";
export type Currency = "usd" | "crc";
export type SizeTier = "presenting" | "premium" | "mid" | "side";

export type PositionCatalog = {
  id: number;
  face: Face;
  price: number;
  size: string;
  tier: SizeTier;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PositionState = {
  status: SpotStatus;
  sponsor: string;
  email: string;
  phone: string;
  logo: string;
  reservedAt: string;
  reservedUntil: string;
  recoveryToken: string;
  txHash: string;
  network: PaymentNetwork | "";
  checkoutToken: string;
  comprobante: string;
};

export type LivePosition = PositionCatalog &
  PositionState & {
    name: string;
    description: string;
    benefits: string[];
    logoGuidance: string;
  };

export type OfferStatus = "pending" | "accepted" | "declined";

export type OfferRecord = {
  id: string;
  createdAt: string;
  brand: string;
  email: string;
  phone: string;
  proposal: string;
  note: string;
  status: OfferStatus;
};

export type StoreShape = {
  positions: Record<string, PositionState>;
  payments: PaymentRecord[];
  offers: OfferRecord[];
  updatedAt: string;
};

export type PaymentRecord = {
  id: string;
  positionId: number;
  brandName: string;
  email: string;
  amount: number;
  network: PaymentNetwork;
  txHash: string;
  verifiedAt: string;
  mode: "stub" | "indexer" | "manual";
};

export type PaymentWallets = {
  sinpe: string;
  evm: string;
  base: string;
  stellar: string;
  solana: string;
  isDemo: boolean;
};

export type InventoryResponse = {
  positions: LivePosition[];
  committed: number;
  available: number;
  reserved: number;
  sold: number;
  total: number;
  updatedAt: string;
  wallets: PaymentWallets;
};
