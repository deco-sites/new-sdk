import { AppContext, Platform } from "../../apps/site.ts";
import shopify from "../../sdk/cart/shopify/setQuantity.ts";
import { usePlatform } from "../../sdk/usePlatform.tsx";

export interface SetQuantityProps {
  itemId: string;
  quantity: number;
}

const notImplemented = () => {
  throw new Error("Not implemented");
};

const actions: Record<
  Platform,
  (props: SetQuantityProps, req: Request, ctx: AppContext) => Promise<unknown>
> = {
  shopify,
  vtex: notImplemented,
  vnda: notImplemented,
  wake: notImplemented,
  linx: notImplemented,
  nuvemshop: notImplemented,
  custom: notImplemented,
};

export default function action(
  props: SetQuantityProps,
  req: Request,
  ctx: AppContext,
) {
  const platform = usePlatform();

  const action = actions[platform];

  if (!action) {
    throw new Error(`No set quantity action found for platform: ${platform}`);
  }

  return action(props, req, ctx);
}
