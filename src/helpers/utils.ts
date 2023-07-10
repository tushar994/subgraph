import { BigInt } from "@graphprotocol/graph-ts";
import { TIMEQUANT } from "../config/config";

export function nearestTimestamp(timestamp: BigInt): BigInt {
  return timestamp.minus(timestamp.mod(BigInt.fromString(TIMEQUANT)));
}

export function getMondayOfWeek(date: Date): Date {
  // Get the day of the week (0-6)
  const dayOfWeek = date.getUTCDay();

  // Calculate the number of days to subtract from the date to get to Monday
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Clone the date and set the date to Monday of the corresponding week
  const monday = new Date(date.getTime() - daysToSubtract * 86400000);

  return monday;
}

export function getDateString(date: Date): string {
  var year = date.getUTCFullYear();
  var month = date.getUTCMonth() + 1; // Note: month index starts from 0
  var day = date.getUTCDate();
  const formattedDate = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
  return formattedDate;
}

export function getDateStringFromTimestamp(timestamp: BigInt): string {
  var date = new Date(timestamp.toI64() * 1000);
  const formattedDate = getDateString(date);
  return formattedDate;
}

export function getDayStartTimeStamp(timestamp: BigInt): BigInt {
  let dayID = timestamp.toI32() / 86400;
  let dayStartTimestamp = dayID * 86400;
  return BigInt.fromI32(dayStartTimestamp);
}

export function getMondayDateStringFromTimestamp(timestamp: BigInt): string {
  var mondayDate = getMondayOfWeek(new Date(timestamp.toI64() * 1000));
  return getDateString(mondayDate);
}
