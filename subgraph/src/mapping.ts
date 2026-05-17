import { Swap as SwapEvent } from "../generated/AMMPool/AMMPool"
import { Swap } from "../generated/schema"

export function handleSwap(event: SwapEvent): void {
  let entity = new Swap(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  
  entity.user = event.params.user
  entity.tokenIn = event.params.tokenIn
  entity.amountIn = event.params.amountIn
  entity.amountOut = event.params.amountOut
  entity.timestamp = event.block.timestamp

  entity.save()
}