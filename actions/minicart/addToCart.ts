import type { PropertyValue } from "apps/commerce/types.ts";
import type { AppContext, Platform } from "../../apps/site.ts";
import shopify from "../../sdk/cart/shopify/addToCart.ts";
import { usePlatform } from "../../sdk/usePlatform.tsx";

export interface AddToCartProps {
  productId: string;
  productGroupId: string;
  quantity: number;
  additionalProperties?: PropertyValue[];
}

const notImplemented = () => {
  throw new Error("Not implemented");
};

const actions: Record<
  Platform,
  (props: AddToCartProps, req: Request, ctx: AppContext) => Promise<unknown>
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
  props: AddToCartProps,
  req: Request,
  ctx: AppContext,
) {
  const platform = usePlatform();

  const action = actions[platform];

  if (!action) {
    throw new Error(`No add to cart action found for platform: ${platform}`);
  }

  return action(props, req, ctx);
}
