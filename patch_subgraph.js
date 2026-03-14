import fs from 'fs';
import path from 'path';

const subgraphDir = 'C:\\\\Users\\\\aryan\\\\Desktop\\\\verdex-arbitrum-sepolia';

console.log("Starting to patch subgraph in:", subgraphDir);

// 1. Write schema.graphql
const schema = `
type Factory @entity(immutable: false) {
  id: ID!
  pairCount: Int!
  totalVolumeUSD: BigDecimal!
  totalVolumeETH: BigDecimal!
  txCount: BigInt!
}

type Token @entity(immutable: false) {
  id: ID!
  symbol: String!
  name: String!
  decimals: BigInt!
  derivedETH: BigDecimal!
  tradeVolume: BigDecimal!
  tradeVolumeUSD: BigDecimal!
  txCount: BigInt!
  totalLiquidity: BigDecimal!
}

type Pair @entity(immutable: false) {
  id: ID!
  token0: Token!
  token1: Token!
  reserve0: BigDecimal!
  reserve1: BigDecimal!
  totalSupply: BigDecimal!
  reserveETH: BigDecimal!
  reserveUSD: BigDecimal!
  token0Price: BigDecimal!
  token1Price: BigDecimal!
  volumeToken0: BigDecimal!
  volumeToken1: BigDecimal!
  volumeUSD: BigDecimal!
  txCount: BigInt!
  createdAtTimestamp: BigInt!
  createdAtBlockNumber: BigInt!
}

type SwapEvent @entity(immutable: true) {
  id: ID!
  pair: Pair!
  timestamp: BigInt!
  sender: Bytes!
  amount0In: BigDecimal!
  amount1In: BigDecimal!
  amount0Out: BigDecimal!
  amount1Out: BigDecimal!
  amountUSD: BigDecimal!
  to: Bytes!
}

type DayData @entity(immutable: false) {
  id: ID!
  date: Int!
  dailyVolumeUSD: BigDecimal!
  dailyVolumeETH: BigDecimal!
  totalLiquidityUSD: BigDecimal!
  totalLiquidityETH: BigDecimal!
  txCount: BigInt!
}

type PairDayData @entity(immutable: false) {
  id: ID!
  date: Int!
  pairAddress: Bytes!
  reserve0: BigDecimal!
  reserve1: BigDecimal!
  reserveUSD: BigDecimal!
  dailyVolumeToken0: BigDecimal!
  dailyVolumeToken1: BigDecimal!
  dailyVolumeUSD: BigDecimal!
  dailyTxns: BigInt!
}
`;
fs.writeFileSync(path.join(subgraphDir, 'schema.graphql'), schema);

// 2. Write subgraph.yaml
const yaml = `
specVersion: 1.0.0
indexerHints:
  prune: auto
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: Factory
    network: arbitrum-sepolia
    source:
      address: "0xf290c44B751262230Fb3737AbF6219199AF92f37"
      abi: Factory
      startBlock: 248843596
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Factory
        - Pair
        - Token
      abis:
        - name: Factory
          file: ./abis/Factory.json
        - name: ERC20
          file: ./abis/ERC20.json
      eventHandlers:
        - event: PairCreated(indexed address,indexed address,address,uint256)
          handler: handlePairCreated
      file: ./src/factory.ts
templates:
  - kind: ethereum/contract
    name: Pair
    network: arbitrum-sepolia
    source:
      abi: Pair
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      file: ./src/core.ts
      entities:
        - Pair
        - SwapEvent
        - DayData
        - PairDayData
      abis:
        - name: Pair
          file: ./abis/Pair.json
        - name: ERC20
          file: ./abis/ERC20.json
      eventHandlers:
        - event: Sync(uint112,uint112)
          handler: handleSync
        - event: Swap(indexed address,uint256,uint256,uint256,uint256,indexed address)
          handler: handleSwap
`;
fs.writeFileSync(path.join(subgraphDir, 'subgraph.yaml'), yaml);

// 3. Write minimal ABIs
const erc20Abi = '[{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"}]';
fs.writeFileSync(path.join(subgraphDir, 'abis', 'ERC20.json'), erc20Abi);

const pairAbi = '[{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint112","name":"reserve0","type":"uint112"},{"indexed":false,"internalType":"uint112","name":"reserve1","type":"uint112"}],"name":"Sync","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount0Out","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1Out","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Swap","type":"event"},{"constant":true,"inputs":[],"name":"token0","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"token1","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"}]';
fs.writeFileSync(path.join(subgraphDir, 'abis', 'Pair.json'), pairAbi);

// 4. Write factory.ts
const factoryTs = `
import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts"
import { PairCreated } from "../generated/Factory/Factory"
import { Factory, Pair, Token } from "../generated/schema"
import { Pair as PairTemplate } from "../generated/templates"
import { ERC20 } from "../generated/Factory/ERC20"

let ZERO_BI = BigInt.fromI32(0)
let ZERO_BD = BigDecimal.fromString('0')

function fetchTokenSymbol(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress)
  let symbolValue = 'UNKNOWN'
  let symbolResult = contract.try_symbol()
  if (!symbolResult.reverted) {
    symbolValue = symbolResult.value
  }
  return symbolValue
}

function fetchTokenName(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress)
  let nameValue = 'Unknown Token'
  let nameResult = contract.try_name()
  if (!nameResult.reverted) {
    nameValue = nameResult.value
  }
  return nameValue
}

function fetchTokenDecimals(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress)
  let decimalValue = 18
  let decimalResult = contract.try_decimals()
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }
  return BigInt.fromI32(decimalValue)
}

export function handlePairCreated(event: PairCreated): void {
  let factory = Factory.load('1')
  if (factory === null) {
    factory = new Factory('1')
    factory.pairCount = 0
    factory.totalVolumeUSD = ZERO_BD
    factory.totalVolumeETH = ZERO_BD
    factory.txCount = ZERO_BI
  }
  factory.pairCount = factory.pairCount + 1
  factory.save()

  let token0 = Token.load(event.params.token0.toHexString())
  if (token0 === null) {
    token0 = new Token(event.params.token0.toHexString())
    token0.symbol = fetchTokenSymbol(event.params.token0)
    token0.name = fetchTokenName(event.params.token0)
    token0.decimals = fetchTokenDecimals(event.params.token0)
    token0.derivedETH = ZERO_BD
    token0.tradeVolume = ZERO_BD
    token0.tradeVolumeUSD = ZERO_BD
    token0.txCount = ZERO_BI
    token0.totalLiquidity = ZERO_BD
  }

  let token1 = Token.load(event.params.token1.toHexString())
  if (token1 === null) {
    token1 = new Token(event.params.token1.toHexString())
    token1.symbol = fetchTokenSymbol(event.params.token1)
    token1.name = fetchTokenName(event.params.token1)
    token1.decimals = fetchTokenDecimals(event.params.token1)
    token1.derivedETH = ZERO_BD
    token1.tradeVolume = ZERO_BD
    token1.tradeVolumeUSD = ZERO_BD
    token1.txCount = ZERO_BI
    token1.totalLiquidity = ZERO_BD
  }

  let pair = new Pair(event.params.pair.toHexString())
  pair.token0 = token0.id
  pair.token1 = token1.id
  pair.reserve0 = ZERO_BD
  pair.reserve1 = ZERO_BD
  pair.totalSupply = ZERO_BD
  pair.reserveETH = ZERO_BD
  pair.reserveUSD = ZERO_BD
  pair.token0Price = ZERO_BD
  pair.token1Price = ZERO_BD
  pair.volumeToken0 = ZERO_BD
  pair.volumeToken1 = ZERO_BD
  pair.volumeUSD = ZERO_BD
  pair.txCount = ZERO_BI
  pair.createdAtTimestamp = event.block.timestamp
  pair.createdAtBlockNumber = event.block.number

  token0.save()
  token1.save()
  pair.save()

  PairTemplate.create(event.params.pair)
}
`
fs.writeFileSync(path.join(subgraphDir, 'src', 'factory.ts'), factoryTs);

// 5. Write core.ts
const coreTs = `
import { BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts"
import { Sync, Swap } from "../generated/templates/Pair/Pair"
import { Pair, Token, Factory, SwapEvent, DayData, PairDayData } from "../generated/schema"

let ZERO_BI = BigInt.fromI32(0)
let ONE_BI = BigInt.fromI32(1)
let ZERO_BD = BigDecimal.fromString('0')

function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = ZERO_BI; i.lt(decimals); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

function updateDayData(event: Sync): DayData {
  let factory = Factory.load('1')
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayData = DayData.load(dayID.toString())
  if (dayData === null) {
    dayData = new DayData(dayID.toString())
    dayData.date = dayStartTimestamp
    dayData.dailyVolumeUSD = ZERO_BD
    dayData.dailyVolumeETH = ZERO_BD
    dayData.totalLiquidityUSD = ZERO_BD
    dayData.totalLiquidityETH = ZERO_BD
    dayData.txCount = ZERO_BI
  }
  if (factory !== null) {
    dayData.totalLiquidityUSD = factory.totalVolumeUSD 
  }
  dayData.save()
  return dayData as DayData
}

function updatePairDayData(event: Sync): PairDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPairID = event.address.toHexString() + '-' + dayID.toString()
  let pair = Pair.load(event.address.toHexString())
  let pairDayData = PairDayData.load(dayPairID)
  
  if (pairDayData === null) {
    pairDayData = new PairDayData(dayPairID)
    pairDayData.date = dayStartTimestamp
    pairDayData.pairAddress = event.address
    pairDayData.reserve0 = ZERO_BD
    pairDayData.reserve1 = ZERO_BD
    pairDayData.reserveUSD = ZERO_BD
    pairDayData.dailyVolumeToken0 = ZERO_BD
    pairDayData.dailyVolumeToken1 = ZERO_BD
    pairDayData.dailyVolumeUSD = ZERO_BD
    pairDayData.dailyTxns = ZERO_BI
  }
  if (pair !== null) {
    pairDayData.reserve0 = pair.reserve0
    pairDayData.reserve1 = pair.reserve1
    pairDayData.reserveUSD = pair.reserveUSD
  }
  pairDayData.save()
  return pairDayData as PairDayData
}

export function handleSync(event: Sync): void {
  let pair = Pair.load(event.address.toHexString())
  if (pair === null) return

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (token0 === null || token1 === null) return

  pair.reserve0 = event.params.reserve0.toBigDecimal().div(exponentToBigDecimal(token0.decimals))
  pair.reserve1 = event.params.reserve1.toBigDecimal().div(exponentToBigDecimal(token1.decimals))

  if (pair.reserve1.notEqual(ZERO_BD)) pair.token0Price = pair.reserve0.div(pair.reserve1)
  else pair.token0Price = ZERO_BD

  if (pair.reserve0.notEqual(ZERO_BD)) pair.token1Price = pair.reserve1.div(pair.reserve0)
  else pair.token1Price = ZERO_BD

  pair.save()

  // In a real env, calculate derivedETH or derivedUSD here

  updatePairDayData(event)
  updateDayData(event)
}

export function handleSwap(event: Swap): void {
  let pair = Pair.load(event.address.toHexString())
  if (pair === null) return

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (token0 === null || token1 === null) return

  let amount0In = event.params.amount0In.toBigDecimal().div(exponentToBigDecimal(token0.decimals))
  let amount1In = event.params.amount1In.toBigDecimal().div(exponentToBigDecimal(token1.decimals))
  let amount0Out = event.params.amount0Out.toBigDecimal().div(exponentToBigDecimal(token0.decimals))
  let amount1Out = event.params.amount1Out.toBigDecimal().div(exponentToBigDecimal(token1.decimals))

  let amount0Total = amount0Out.plus(amount0In)
  let amount1Total = amount1Out.plus(amount1In)

  pair.txCount = pair.txCount.plus(ONE_BI)
  pair.volumeToken0 = pair.volumeToken0.plus(amount0Total)
  pair.volumeToken1 = pair.volumeToken1.plus(amount1Total)

  // VERY SIMPLIFIED USD tracking
  let derivedAmountUSD = amount0Total.plus(amount1Total).div(BigDecimal.fromString('2'))
  pair.volumeUSD = pair.volumeUSD.plus(derivedAmountUSD)
  pair.save()

  token0.txCount = token0.txCount.plus(ONE_BI)
  token0.tradeVolume = token0.tradeVolume.plus(amount0Total)
  token0.save()

  token1.txCount = token1.txCount.plus(ONE_BI)
  token1.tradeVolume = token1.tradeVolume.plus(amount1Total)
  token1.save()

  let factory = Factory.load('1')
  if (factory !== null) {
    factory.txCount = factory.txCount.plus(ONE_BI)
    factory.totalVolumeUSD = factory.totalVolumeUSD.plus(derivedAmountUSD)
    factory.save()
  }

  let swapEvent = new SwapEvent(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  )
  swapEvent.timestamp = event.block.timestamp
  swapEvent.pair = pair.id
  swapEvent.sender = event.params.sender
  swapEvent.amount0In = amount0In
  swapEvent.amount1In = amount1In
  swapEvent.amount0Out = amount0Out
  swapEvent.amount1Out = amount1Out
  swapEvent.amountUSD = derivedAmountUSD
  swapEvent.to = event.params.to
  swapEvent.save()

  // Update daily
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayData = DayData.load(dayID.toString())
  if (dayData !== null) {
    dayData.dailyVolumeUSD = dayData.dailyVolumeUSD.plus(derivedAmountUSD)
    dayData.txCount = dayData.txCount.plus(ONE_BI)
    dayData.save()
  }

  let dayPairID = event.address.toHexString() + '-' + dayID.toString()
  let pairDayData = PairDayData.load(dayPairID)
  if (pairDayData !== null) {
    pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(amount0Total)
    pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(amount1Total)
    pairDayData.dailyVolumeUSD = pairDayData.dailyVolumeUSD.plus(derivedAmountUSD)
    pairDayData.dailyTxns = pairDayData.dailyTxns.plus(ONE_BI)
    pairDayData.save()
  }
}
`
fs.writeFileSync(path.join(subgraphDir, 'src', 'core.ts'), coreTs);

console.log('Successfully patched the subgraph to include Swap and Sync mappings!');
