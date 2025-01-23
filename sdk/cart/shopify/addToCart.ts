import type { AppContext } from "./index.ts";
import type { AddToCartProps } from "../../../actions/minicart/addToCart.ts";

export default async function addToCart(
  props: AddToCartProps,
  _req: Request,
  ctx: AppContext,
) {
  const response = await ctx.invoke(
    "shopify/actions/cart/addItems.ts",
    {
      lines: {
        merchandiseId: props.id,
        quantity: props.quantity,
      },
    },
  );

  return response;
}
