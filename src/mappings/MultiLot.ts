import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  ClaimWithdrawn,
  LotCreated,
  Invited,
  LotJoined,
  RefundWithdrawn,
  LotResolved,
  FeeWithdrawn,
} from "../../generated/MultiLot/MultiLot";
import {
  MultiLotPosition,
  MultiLotAction,
  MultiLot,
  MultiLotInvite,
  User,
  UserDailyQuestData,
  UserWeeklyQuestData,
  PendingPriceUpdate,
} from "../../generated/schema";
import { getTokenType, TIMEQUANT, ARENALOT_CREATOR, SECONDS_IN_DAY, SECONDS_IN_WEEK } from "../config/config"
import {nearestTimestamp, getMondayOfWeek, getDateString, getDateStringFromTimestamp, getMondayDateStringFromTimestamp} from "../helpers/utils"
import {
  addNewUserAnalyticsOverallData,
  incrementNumLotsCreated,
  incrementCollateralUsage,
  incrementDailyActiveUserCount,
  incrementDailyUserWinning,
  incrementDailyFeesGenerated,
  getPlayerWinningAndFees,
  incrementTokenUseInLot,
  incrementDailyTransactionalValue
} from "./AnalyticsHelper";


function createOrGetUser(address: Address): User {
  const user = User.load(address.toHexString());
  if (!user) {

    const user = new User(address.toHexString());
    user.total_deposit = BigInt.fromString("0");
    user.total_claim = BigInt.fromString("0");
    user.total_refund = BigInt.fromString("0");
    user.num_lots = BigInt.fromString("0");
    user.num_winning_lots = BigInt.fromString("0");
    user.num_win_streak = BigInt.fromString("0");
    user.total_profit = BigInt.fromString("0");
    user.total_loss = BigInt.fromString("0");
    user.save();

    addNewUserAnalyticsOverallData();

    return user;
  } else return user;
}

// adds a new entry for that day/week
function updateUserQuestData(address: Address, timestamp: BigInt): void{
  var date = new Date(timestamp.toI64()*1000);
  const formattedDate = getDateString(date);

  const mondayDate = getMondayOfWeek(date);
  const formattedMondayDate = getDateString(mondayDate)

  var userQuestData = UserDailyQuestData.load(formattedDate.concat(address.toHexString()));
  if(userQuestData==null){
    var quests = new UserDailyQuestData(formattedDate.concat(address.toHexString()));
    quests.date = formattedDate;
    quests.user = address.toHexString()
    quests.CREATE_CHALLENGE_LOT = false
    quests.CREATE_MULTI_LOT = false
    quests.CREATE_NFT_LOT = false
    quests.CREATE_INDEX_LOT = false

    quests.JOIN_CHALLENGE_LOT = false
    quests.JOIN_MULTI_LOT = false
    quests.JOIN_NFT_LOT = false
    quests.JOIN_DAILY_ARENA = false

    quests.WIN_LOT = false
    quests.WIN_CROSS_SECTOR_LOT = false
    quests.WIN_BTC_LOT = false
    quests.WIN_ETH_LOT = false
    quests.WIN_MATIC_LOT = false
    quests.WIN_ARB_LOT = false
    quests.WIN_NFT_LOT = false
    quests.WIN_DOGE_LOT = false
    quests.WIN_INDEX_LOT = false
    quests.WIN_FOREX_LOT = false
    quests.WIN_STOCK_INDICES_LOT = false
    quests.WIN_COMMODITIES_LOT = false
    quests.WIN_DAILY_ARENA = false
    quests.save();
  }
  
  var userWeeklyQuestData = UserWeeklyQuestData.load(formattedMondayDate.concat(address.toHexString()));
  if(userWeeklyQuestData==null){
    var weeklyQuests = new UserWeeklyQuestData(formattedMondayDate.concat(address.toHexString()));
    weeklyQuests.date = formattedMondayDate;
    weeklyQuests.user = address.toHexString()
    weeklyQuests.JOIN_WEEKLY_ARENA = false
    weeklyQuests.WIN_WEEKLY_ARENA = false
    weeklyQuests.WIN_5_IN_ROW = false
    weeklyQuests.WIN_10_IN_ROW = false
    weeklyQuests.WIN_15_IN_ROW = false
    weeklyQuests.save()
  }
}

function createOrGetPendingPriceUpdate(timestamp: string): PendingPriceUpdate {
  const pendingPriceUpdate = PendingPriceUpdate.load(timestamp);
  if (!pendingPriceUpdate) {
    const pendingPriceUpdate = new PendingPriceUpdate(timestamp);
    pendingPriceUpdate.lotStartIds = [];
    pendingPriceUpdate.lotResolveIds = [];
    pendingPriceUpdate.save();
    return pendingPriceUpdate;
  } else return pendingPriceUpdate;
}

// handlers
export function handleLotCreated(event: LotCreated): void {
  const user = createOrGetUser(event.params.creator);
  updateUserQuestData(event.params.creator, event.block.timestamp);

  incrementNumLotsCreated(event.block.timestamp, event.params.duration);

  let _isArenaLot = false;

  if (event.params.creator.equals(Address.fromString(ARENALOT_CREATOR))) {
    _isArenaLot = true;
  }
  const lot = new MultiLot(event.params.lotId.toString());
  lot.tokenA = event.params.tokenA;
  incrementTokenUseInLot(event.block.timestamp, event.params.tokenA);
  lot.tokenB = "";
  lot.tokenBChoices = event.params.tokenBChoices;
  lot.startEpoch = event.params.startEpoch;
  lot.nearestStartEpoch = nearestTimestamp(event.params.startEpoch);
  lot.nearestEndEpoch = nearestTimestamp(
    event.params.startEpoch.plus(event.params.duration)
  );
  lot.duration = event.params.duration;
  lot.positionIds = new Array<string>(0);
  lot.isPrivate = event.params.isPrivate;
  lot.isChallenge = event.params.isChallenge;
  lot.resolved = false;
  lot.creator = user.id;
  lot.totalDepositPoolA = new BigInt(0);
  lot.totalDepositPoolB = new BigInt(0);
  lot.isArenaLot = _isArenaLot;
  lot.num_deposits = new BigInt(0);
  lot.save();

  const quests = UserDailyQuestData.load(getDateStringFromTimestamp(event.block.timestamp).concat(user.id));
  if (lot.isChallenge && !quests!.CREATE_CHALLENGE_LOT) {
    quests!.CREATE_CHALLENGE_LOT = true;
    quests!.save();
  } else if (!lot.isChallenge && !quests!.CREATE_MULTI_LOT) {
    quests!.CREATE_MULTI_LOT = true;
    quests!.save();
  }
  if(getTokenType(lot.tokenA)=="ethnft" && !quests!.CREATE_NFT_LOT){
    quests!.CREATE_NFT_LOT = true;
    quests!.save();
  }
  else if(getTokenType(lot.tokenA)=="index" && !quests!.CREATE_INDEX_LOT){
    quests!.CREATE_INDEX_LOT = true;
    quests!.save();
  }

  const action = new MultiLotAction(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  action.tx = event.transaction.hash;
  action.lot = event.params.lotId.toString();
  action.user = user.id;
  action.type = "CREATE";
  action.timestamp = event.block.timestamp;
  action.save();

  const startPendingPriceUpdate = createOrGetPendingPriceUpdate(
    nearestTimestamp(lot.startEpoch).toString()
  );
  let startLots = startPendingPriceUpdate.lotStartIds;
  startLots!.push(lot.id);
  startPendingPriceUpdate.lotStartIds = startLots;
  startPendingPriceUpdate.save();

  const resolvePendingPriceUpdate = createOrGetPendingPriceUpdate(
    nearestTimestamp(lot.startEpoch.plus(lot.duration)).toString()
  );
  let resolveLots = resolvePendingPriceUpdate.lotResolveIds;
  resolveLots!.push(lot.id);
  resolvePendingPriceUpdate.lotResolveIds = resolveLots;
  resolvePendingPriceUpdate.save();
}

export function handleInvited(event: Invited): void {
  for (let i = 0; i < event.params.to.length; i++) {
    const inviteId =
      event.params.lotId.toString() +
      "-" +
      event.params.from.toHexString() +
      "-" +
      event.params.to[i].toHexString();
    const invite = MultiLotInvite.load(inviteId);
    if (!invite) {
      const invite = new MultiLotInvite(inviteId);
      invite.lot = event.params.lotId.toString();
      invite.from = event.params.from.toHexString();
      invite.to = event.params.to[i].toHexString();
      invite.timestamp = event.block.timestamp;
      invite.save();
    }
  }
}

export function handleLotJoined(event: LotJoined): void {
  const user = createOrGetUser(event.params.user);
  updateUserQuestData(event.params.user, event.block.timestamp);

  incrementDailyActiveUserCount(event.block.timestamp)
  incrementDailyTransactionalValue(event.block.timestamp, event.params.size);

  user.total_deposit = user.total_deposit.plus(event.params.size);

  const lot = MultiLot.load(event.params.lotId.toString())!;
  lot.num_deposits = lot.num_deposits.plus(BigInt.fromString("1"));
  lot.save();

  const quests = UserDailyQuestData.load(getDateStringFromTimestamp(event.block.timestamp).concat(user.id));
  const userWeeklyQuestData = UserWeeklyQuestData.load(getMondayDateStringFromTimestamp(event.block.timestamp).concat(user.id));
  if(lot.creator != event.params.user.toHexString()){
    if (lot.isChallenge && !quests!.JOIN_CHALLENGE_LOT) {
      quests!.JOIN_CHALLENGE_LOT = true;
      quests!.save();
    } else if (!lot.isChallenge && !quests!.JOIN_MULTI_LOT) {
      quests!.JOIN_MULTI_LOT = true;
      quests!.save();
    }
    if(getTokenType(event.params.token)=="ethnft" && !quests!.JOIN_NFT_LOT){
      quests!.JOIN_NFT_LOT = true;
      quests!.save();
    }
    if(lot.isArenaLot && lot.duration==BigInt.fromString(SECONDS_IN_DAY) && !quests!.JOIN_DAILY_ARENA){
      quests!.JOIN_DAILY_ARENA = true;
      quests!.save();
    }
    else if(lot.isArenaLot && lot.duration==BigInt.fromString(SECONDS_IN_WEEK) && !userWeeklyQuestData!.JOIN_WEEKLY_ARENA){
      userWeeklyQuestData!.JOIN_WEEKLY_ARENA = true;
      userWeeklyQuestData!.save();
    }
  }

  const positionId =
    event.params.lotId.toString() + "-" + event.params.user.toHexString();
  const position = MultiLotPosition.load(positionId);
  if (position) {
    position.size = position.size.plus(event.params.size);
    position.save();
  } else {
    const position = new MultiLotPosition(positionId);
    position.lot = event.params.lotId.toString();
    position.user = user.id;
    position.token = event.params.token;
    position.size = event.params.size;
    position.claimed_token = false;
    position.save();
    lot.positionIds = lot.positionIds!.concat([positionId]);
    user.num_lots = user.num_lots.plus(BigInt.fromString("1"));
  }
  user.save();

  if (event.params.token == lot.tokenA) {
    lot.totalDepositPoolA = lot.totalDepositPoolA.plus(event.params.size);
  } else if (!lot.tokenB) {
    lot.tokenB = event.params.token;
    incrementTokenUseInLot(event.block.timestamp, event.params.token);
  }
  if (event.params.token == lot.tokenB) {
    lot.totalDepositPoolB = lot.totalDepositPoolB.plus(event.params.size);
  }
  lot.save();

  const action = new MultiLotAction(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  action.tx = event.transaction.hash;
  action.lot = event.params.lotId.toString();
  action.user = user.id;
  action.type = "JOIN";
  action.timestamp = event.block.timestamp;
  action.save();
}

export function handleLotResolved(event: LotResolved): void {
  const lot = MultiLot.load(event.params.lotId.toString())!;
  incrementCollateralUsage(event.block.timestamp, event.params.size.times(BigInt.fromString("2")));

  const earnedAmounts = getPlayerWinningAndFees(event.params.size);
  incrementDailyUserWinning(event.block.timestamp, earnedAmounts[0]);
  incrementDailyFeesGenerated(event.block.timestamp,earnedAmounts[1]);

  lot.resolved = true;
  lot.resolveSize = event.params.size;
  lot.winningToken = event.params.winningToken;
  lot.startPriceTokenA = event.params.startPriceTokenA;
  lot.startPriceTokenB = event.params.startPriceTokenB;
  lot.resolvePriceTokenA = event.params.resolvePriceTokenA;
  lot.resolvePriceTokenB = event.params.resolvePriceTokenB;
  lot.save();

  for (let i = 0; i < lot.positionIds!.length; i++) {
    const position = MultiLotPosition.load(lot.positionIds![i]);
    const user = User.load(position!.user);
    updateUserQuestData(Address.fromString(user!.id), event.block.timestamp);
    if (position!.token == lot.winningToken) {
      user!.num_winning_lots = user!.num_winning_lots.plus(
        BigInt.fromString("1")
      );
      user!.num_win_streak = user!.num_win_streak.plus(
        BigInt.fromString("1")
      );
      user!.total_profit = user!.total_profit.plus((earnedAmounts[0].times(position!.size)).div(event.params.size));
      user!.save();

      var userWeeklyQuestData = UserWeeklyQuestData.load(getMondayDateStringFromTimestamp(event.block.timestamp).concat(user!.id));
      if(user!.num_win_streak == BigInt.fromString("5") && !userWeeklyQuestData!.WIN_5_IN_ROW){
        userWeeklyQuestData!.WIN_5_IN_ROW = true;
        userWeeklyQuestData!.save();
      }
      else if(user!.num_win_streak == BigInt.fromString("10") && !userWeeklyQuestData!.WIN_10_IN_ROW){
        userWeeklyQuestData!.WIN_10_IN_ROW = true;
        userWeeklyQuestData!.save();
      }
      else if(user!.num_win_streak == BigInt.fromString("15") && !userWeeklyQuestData!.WIN_15_IN_ROW){
        userWeeklyQuestData!.WIN_15_IN_ROW = true;
        userWeeklyQuestData!.save();
      }
      if(lot.isArenaLot && lot.duration == BigInt.fromString(SECONDS_IN_WEEK) && !userWeeklyQuestData!.WIN_WEEKLY_ARENA){
        userWeeklyQuestData!.WIN_WEEKLY_ARENA = true;
        userWeeklyQuestData!.save()
      }

      const quests = UserDailyQuestData.load(getDateStringFromTimestamp(event.block.timestamp).concat(user!.id));
      if (!quests!.WIN_LOT) {
        quests!.WIN_LOT = true;
        quests!.save();
      }
      if(position!.token == "ethereum" && !quests!.WIN_ETH_LOT){
        quests!.WIN_ETH_LOT = true;
        quests!.save();
      }
      else if(position!.token == "bitcoin" && !quests!.WIN_BTC_LOT){
        quests!.WIN_BTC_LOT = true;
        quests!.save()
      }
      else if(position!.token == "arbitrum" && !quests!.WIN_ARB_LOT){
        quests!.WIN_ARB_LOT = true;
        quests!.save();
      }
      else if(position!.token=="dogecoin" && !quests!.WIN_DOGE_LOT){
        quests!.WIN_DOGE_LOT = true;
        quests!.save();
      }
      else if(position!.token == "matic-network" && !quests!.WIN_MATIC_LOT){
        quests!.WIN_MATIC_LOT = true;
        quests!.save();
      }
      else if(getTokenType(position!.token)=="ethnft" && !quests!.WIN_NFT_LOT){
        quests!.WIN_NFT_LOT = true;
        quests!.save();
      }
      else if(getTokenType(position!.token)=="index" && !quests!.WIN_INDEX_LOT){
        quests!.WIN_INDEX_LOT = true;
        quests!.save();
      }
      else if(getTokenType(position!.token)=="forex" && !quests!.WIN_FOREX_LOT){
        quests!.WIN_FOREX_LOT = true;
        quests!.save();
      }
      else if(getTokenType(position!.token)=="stock" && !(quests!.WIN_STOCK_INDICES_LOT)){
        quests!.WIN_STOCK_INDICES_LOT = true;
        quests!.save();
      }
      else if(getTokenType(position!.token)==='commodity' && !quests!.WIN_COMMODITIES_LOT){
        quests!.WIN_COMMODITIES_LOT = true;
        quests!.save();
      }

      if(lot.isArenaLot && lot.duration == BigInt.fromString(SECONDS_IN_DAY) && !quests!.WIN_DAILY_ARENA){
        quests!.WIN_DAILY_ARENA = true;
        quests!.save()
      }
    }
    else{
      user!.num_win_streak = BigInt.fromString("0");
      user!.total_loss = user!.total_loss.plus(position!.size);
      user!.save();
      position!.claimed_token = true;
      position!.save()
    }
  }
}

export function handleClaimWithdrawn(event: ClaimWithdrawn): void {
  const user = createOrGetUser(event.params.user);
  updateUserQuestData(event.params.user, event.block.timestamp);
  user.total_claim = user.total_claim.plus(event.params.amount);
  user.save();
  const action = new MultiLotAction(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  action.tx = event.transaction.hash;
  action.lot = event.params.lotId.toString();
  action.user = user.id;
  action.type = "WITHDRAW_CLAIM";
  action.timestamp = event.block.timestamp;
  action.save();
  const positionId =
    event.params.lotId.toString() + "-" + event.params.user.toHexString();
  const position = MultiLotPosition.load(positionId);
  if(position){
    position.claimed_token = true;
    position.save();
  }
}

export function handleRefundWithdrawn(event: RefundWithdrawn): void {
  const user = createOrGetUser(event.params.user);
  updateUserQuestData(event.params.user, event.block.timestamp);
  user.total_refund = user.total_refund.plus(event.params.amount);
  user.save();
  const action = new MultiLotAction(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  action.tx = event.transaction.hash;
  action.lot = event.params.lotId.toString();
  action.user = user.id;
  action.type = "WITHDRAW_REFUND";
  action.timestamp = event.block.timestamp;
  action.save();
  const lot = MultiLot.load(event.params.lotId.toString());
  const positionId =
    event.params.lotId.toString() + "-" + event.params.user.toHexString();
  const position = MultiLotPosition.load(positionId);
  if(lot!.tokenB == "" && position){
    position.claimed_token = true;
    position.save();
  }
}
