import { BigInt, store } from "@graphprotocol/graph-ts";
import { Stored } from "../../generated/PriceFeed/PriceFeed";
import { MultiLot, PendingPriceUpdate } from "../../generated/schema";

// handlers
export function handleStored(event: Stored): void {
  const pendingPriceUpdate = PendingPriceUpdate.load(
    event.params.timestamp.toString()
  );
  if (pendingPriceUpdate === null) {
    return;
  }
  const tokenPrices = new Map<string, BigInt>();
  for (let i = 0; i < event.params.tokenIds.length; i++) {
    tokenPrices.set(event.params.tokenIds[i], event.params.prices[i]);
  }

  const pendingLotStartIds: string[] = [];
  for (let i = 0; i < pendingPriceUpdate.lotStartIds!.length; i++) {
    const lotId = pendingPriceUpdate.lotStartIds![i];
    const lot = MultiLot.load(lotId);
    if (lot === null) continue;
    if (tokenPrices.has(lot.tokenA)) {
      lot.startPriceTokenA = tokenPrices.get(lot.tokenA);
    }
    if (tokenPrices.has(lot.tokenB)) {
      lot.startPriceTokenB = tokenPrices.get(lot.tokenB);
    }
    lot.save();
    if (lot.startPriceTokenA === null || lot.startPriceTokenB === null) {
      pendingLotStartIds.push(lotId);
    }
  }

  const pendingLotResolveIds: string[] = [];
  for (let i = 0; i < pendingPriceUpdate.lotResolveIds!.length; i++) {
    const lotId = pendingPriceUpdate.lotResolveIds![i];
    const lot = MultiLot.load(lotId);
    if (lot === null) continue;
    if (tokenPrices.has(lot.tokenA)) {
      lot.resolvePriceTokenA = tokenPrices.get(lot.tokenA);
    }
    if (tokenPrices.has(lot.tokenB)) {
      lot.resolvePriceTokenB = tokenPrices.get(lot.tokenB);
    }
    lot.save();
    if (lot.resolvePriceTokenA === null || lot.resolvePriceTokenB === null) {
      pendingLotResolveIds.push(lotId);
    }
  }
  if (pendingLotStartIds.length || pendingLotResolveIds.length) {
    // Some lots didn't get all required price updates. Update the pending list
    pendingPriceUpdate.lotStartIds = pendingLotStartIds;
    pendingPriceUpdate.lotResolveIds = pendingLotResolveIds;
    pendingPriceUpdate.save();
  } else {
    // No more lots pending to be resolved at this timestamp. Can delete the entry
    store.remove("PendingPriceUpdate", event.params.timestamp.toString());
  }
}
