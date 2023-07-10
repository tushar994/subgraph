import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { MultiLot as MultiLotContract } from "../../generated/MultiLot/MultiLot";
import {
  AnalyticsOverallData,
  AnalyticsDailyData,
  LotsPerAssetClassDailyData,
  LotsPerAssetDailyData,
  LotsPerAssetClassOverallData,
  LotsPerAssetOverallData
} from "../../generated/schema";
import { getDayStartTimeStamp } from "../helpers/utils";
import { getTokenType } from "../config/config"

function createOrGetAnalyticsDailyData(timestamp: BigInt): AnalyticsDailyData {
  const analyticsDailyData = AnalyticsDailyData.load(timestamp.toString());
  if (!analyticsDailyData) {
    const analyticsDailyData = new AnalyticsDailyData(timestamp.toString());

    analyticsDailyData.date = timestamp;
    analyticsDailyData.daily_lots_created_count = BigInt.fromString("0");
    analyticsDailyData.daily_total_collateral = BigInt.fromString("0");
    analyticsDailyData.daily_active_user_count = BigInt.fromString("0");
    analyticsDailyData.daily_user_winnings = BigInt.fromString("0");
    analyticsDailyData.daily_protocol_fees = BigInt.fromString("0");
    analyticsDailyData.daily_transactional_value = BigInt.fromString("0");

    analyticsDailyData.save();

    return analyticsDailyData;
  } else return analyticsDailyData;
}

function createOrGetAnalyticsOverallData(): AnalyticsOverallData {
  const analyticsOverallData = AnalyticsOverallData.load("0");
  if (!analyticsOverallData) {
    const analyticsOverallData = new AnalyticsOverallData("0");

    analyticsOverallData.total_unique_user_count = BigInt.fromString("0");
    analyticsOverallData.avg_lot_duration = BigDecimal.fromString("0");
    analyticsOverallData.total_lots_created_count = BigInt.fromString("0");
    analyticsOverallData.total_collateral = BigInt.fromString("0");
    analyticsOverallData.total_active_user_count = BigInt.fromString("0");
    analyticsOverallData.total_user_winnings = BigInt.fromString("0");
    analyticsOverallData.total_protocol_fees = BigInt.fromString("0");
    analyticsOverallData.total_transactional_value = BigInt.fromString("0");

    analyticsOverallData.save();

    return analyticsOverallData;
  } else return analyticsOverallData;
}

function createOrGetLotsPerAssetClassOverallData(
  tokenClass: string,
): LotsPerAssetClassOverallData {
  const lotsPerAssetClassOverallData = LotsPerAssetClassOverallData.load(tokenClass);
  if (!lotsPerAssetClassOverallData) {
    const lotsPerAssetClassOverallData = new LotsPerAssetClassOverallData(tokenClass);
    lotsPerAssetClassOverallData.lots_created_count = BigInt.fromString("0");
    lotsPerAssetClassOverallData.asset_class = tokenClass;

    lotsPerAssetClassOverallData.save();
    return lotsPerAssetClassOverallData;
  } else return lotsPerAssetClassOverallData;
}

function createOrGetLotsPerAssetClassDailyData(
  tokenClass: string,
  timestamp: BigInt
): LotsPerAssetClassDailyData {
  const lotsPerAssetClassDailyData = LotsPerAssetClassDailyData.load(tokenClass.concat(timestamp.toString()));
  if (!lotsPerAssetClassDailyData) {
    const lotsPerAssetClassDailyData = new LotsPerAssetClassDailyData(tokenClass.concat(timestamp.toString()));
    lotsPerAssetClassDailyData.date = timestamp;
    lotsPerAssetClassDailyData.daily_lots_created_count = BigInt.fromString("0");
    lotsPerAssetClassDailyData.asset_class = tokenClass;

    lotsPerAssetClassDailyData.save();
    return lotsPerAssetClassDailyData;
  } else return lotsPerAssetClassDailyData;
}

function createOrGetLotsPerAssetOverallData(
  token: string,
): LotsPerAssetOverallData {
  const lotsPerAssetOverallData = LotsPerAssetOverallData.load(token);
  if (!lotsPerAssetOverallData) {
    const lotsPerAssetOverallData = new LotsPerAssetOverallData(token);
    lotsPerAssetOverallData.lots_created_count = BigInt.fromString("0");
    lotsPerAssetOverallData.asset = token;

    lotsPerAssetOverallData.save();
    return lotsPerAssetOverallData;
  } else return lotsPerAssetOverallData;
}


function createOrGetLotsPerAssetDailyData(token: string, timestamp: BigInt): LotsPerAssetDailyData {
  const lotsPerAssetDailyData = LotsPerAssetDailyData.load(token.concat(timestamp.toString()));
  if (!lotsPerAssetDailyData) {
    const lotsPerAssetDailyData = new LotsPerAssetDailyData(token.concat(timestamp.toString()));
    lotsPerAssetDailyData.date = timestamp;
    lotsPerAssetDailyData.daily_lots_created_count = BigInt.fromString("0");
    lotsPerAssetDailyData.asset = token;

    lotsPerAssetDailyData.save();
    return lotsPerAssetDailyData;
  } else return lotsPerAssetDailyData;
}

export function addNewUserAnalyticsOverallData(): void {
  const analyticsOverallData = createOrGetAnalyticsOverallData();
  analyticsOverallData.total_unique_user_count = analyticsOverallData.total_unique_user_count.plus(BigInt.fromString("1"));
  analyticsOverallData.save();
}

export function incrementNumLotsCreated(timestamp: BigInt, duration: BigInt): void {
  timestamp = getDayStartTimeStamp(timestamp);

  const analyticsOverallData = createOrGetAnalyticsOverallData();
  var avg_lot_duration = analyticsOverallData.avg_lot_duration;
  var total_lots_created_count = analyticsOverallData.total_lots_created_count;
  avg_lot_duration = avg_lot_duration.times(total_lots_created_count.toBigDecimal());
  avg_lot_duration = avg_lot_duration.plus(duration.toBigDecimal());
  total_lots_created_count = total_lots_created_count.plus(BigInt.fromString("1"));
  avg_lot_duration = avg_lot_duration.div(total_lots_created_count.toBigDecimal());

  analyticsOverallData.avg_lot_duration = avg_lot_duration;
  analyticsOverallData.total_lots_created_count = total_lots_created_count;
  analyticsOverallData.save();

  const analyticsDailyData = createOrGetAnalyticsDailyData(timestamp);
  analyticsDailyData.daily_lots_created_count = analyticsDailyData.daily_lots_created_count.plus(BigInt.fromString("1"));
  analyticsDailyData.save();
}

export function incrementTokenUseInLot(timestamp: BigInt, token:string): void {
  timestamp = getDayStartTimeStamp(timestamp);

  const tokenClass = getTokenType(token);
  const lotsPerAssetClassOverallData = createOrGetLotsPerAssetClassOverallData(tokenClass);
  lotsPerAssetClassOverallData.lots_created_count = lotsPerAssetClassOverallData.lots_created_count.plus(BigInt.fromString("1"));
  lotsPerAssetClassOverallData.save();
  
  const lotsPerAssetClassDailyData = createOrGetLotsPerAssetClassDailyData(tokenClass, timestamp);
  lotsPerAssetClassDailyData.daily_lots_created_count = lotsPerAssetClassDailyData.daily_lots_created_count.plus(BigInt.fromString("1"));
  lotsPerAssetClassDailyData.save();

  const lotsPerAssetDailyData = createOrGetLotsPerAssetDailyData(token, timestamp);
  lotsPerAssetDailyData.daily_lots_created_count = lotsPerAssetDailyData.daily_lots_created_count.plus(BigInt.fromString("1"));
  lotsPerAssetDailyData.save();

  const lotsPerAssetOverallData = createOrGetLotsPerAssetOverallData(token);
  lotsPerAssetOverallData.lots_created_count = lotsPerAssetOverallData.lots_created_count.plus(BigInt.fromString("1"));
  lotsPerAssetOverallData.save();
}

export function getPlayerWinningAndFees(
  amount: BigInt
): BigInt[] {

  // Fetch the additional data from the contract
  const feePercentage = BigInt.fromString("10");
  const feeAmount = amount.times(feePercentage).div(BigInt.fromString("100"));
  return [amount.minus(feeAmount), feeAmount];
}

export function incrementCollateralUsage(
  timestamp: BigInt,
  size: BigInt
): void {
  timestamp = getDayStartTimeStamp(timestamp);

  const analyticsOverallData = createOrGetAnalyticsOverallData();
  analyticsOverallData.total_collateral = analyticsOverallData.total_collateral.plus(size);
  analyticsOverallData.save();

  const analyticsDailyData = createOrGetAnalyticsDailyData(timestamp);
  analyticsDailyData.daily_total_collateral = analyticsDailyData.daily_total_collateral.plus(size);
  analyticsDailyData.save();
}

export function incrementDailyActiveUserCount(timestamp: BigInt): void {
  timestamp = getDayStartTimeStamp(timestamp);

  const analyticsOverallData = createOrGetAnalyticsOverallData();
  analyticsOverallData.total_active_user_count = analyticsOverallData.total_active_user_count.plus(BigInt.fromString("1"));
  analyticsOverallData.save();

  const analyticsDailyData = createOrGetAnalyticsDailyData(timestamp);
  analyticsDailyData.daily_active_user_count = analyticsDailyData.daily_active_user_count.plus(BigInt.fromString("1"));
  analyticsDailyData.save();
}

export function incrementDailyUserWinning(
  timestamp: BigInt,
  size: BigInt
): void {
  timestamp = getDayStartTimeStamp(timestamp);

  const analyticsOverallData = createOrGetAnalyticsOverallData();
  analyticsOverallData.total_user_winnings = analyticsOverallData.total_user_winnings.plus(size);
  analyticsOverallData.save();

  const analyticsDailyData = createOrGetAnalyticsDailyData(timestamp);
  analyticsDailyData.daily_user_winnings = analyticsDailyData.daily_user_winnings.plus(size);
  analyticsDailyData.save();
}

export function incrementDailyFeesGenerated(
  timestamp: BigInt,
  size: BigInt
): void {
  timestamp = getDayStartTimeStamp(timestamp);

  const analyticsOverallData = createOrGetAnalyticsOverallData();
  analyticsOverallData.total_protocol_fees = analyticsOverallData.total_protocol_fees.plus(size);
  analyticsOverallData.save();

  const analyticsDailyData = createOrGetAnalyticsDailyData(timestamp);
  analyticsDailyData.daily_protocol_fees = analyticsDailyData.daily_protocol_fees.plus(size);
  analyticsDailyData.save();
}

export function incrementDailyTransactionalValue(
  timestamp: BigInt,
  size: BigInt
): void {
  timestamp = getDayStartTimeStamp(timestamp);

  const analyticsOverallData = createOrGetAnalyticsOverallData();
  analyticsOverallData.total_transactional_value = analyticsOverallData.total_transactional_value.plus(size);
  analyticsOverallData.save();

  const analyticsDailyData = createOrGetAnalyticsDailyData(timestamp);
  analyticsDailyData.daily_transactional_value = analyticsDailyData.daily_transactional_value.plus(size);
  analyticsDailyData.save();
}
