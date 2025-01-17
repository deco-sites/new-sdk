import { AppContext, Platform } from "../../apps/site.ts";
import { usePlatform } from "../../sdk/usePlatform.tsx";
import shopify from "../../sdk/cart/shopify/addToCart.ts";

export interface AddToCartProps {
  id: string;
  quantity: number;
}

const actions: Record<Platform, (props: AddToCartProps, req: Request, ctx: AppContext) => Promise<unknown>> = {
  shopify,
};

export default async function action(props: AddToCartProps, req: Request, ctx: AppContext) {
  const platform = usePlatform();

  const action = actions[platform];

  if (!action) {
    throw new Error(`No add to cart action found for platform: ${platform}`);
  }

  return action(props, req, ctx);
}
