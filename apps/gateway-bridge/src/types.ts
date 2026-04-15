export type BridgePoint = {
  assetKey: string;
  pointKey: string;
  objectIdentifier: string;
  objectName: string;
  canonicalPointType?: string;
  unit?: string;
  isWritable?: boolean;
  isWhitelisted?: boolean;
  safetyCategory?: string;
  presentValue?: string | number;
  qualityFlag?: string;
};

export type BridgeAsset = {
  assetKey: string;
  systemName: string;
  assetType?: string;
  protocol?: string;
  vendor?: string;
  location?: string;
  status?: string;
  points: BridgePoint[];
};

export type BridgeSnapshot = {
  observedAt?: string;
  assets: BridgeAsset[];
};

export type BridgeTelemetryEvent = {
  assetKey?: string;
  pointKey?: string;
  objectIdentifier?: string;
  value: string | number;
  unit?: string;
  qualityFlag?: string;
};

export type BridgeCommandInput = {
  dispatchId: string;
  commandId: string;
  pointId: string;
  command: {
    assetKey?: string | null;
    pointKey?: string | null;
    objectIdentifier?: string;
    requestedValue?: string;
  };
};

export type BridgeCommandResult =
  | {
      success: true;
      appliedValue?: string;
      responseJson?: string;
    }
  | {
      success: false;
      errorMessage: string;
      responseJson?: string;
    };
