import type { AppContext } from "./index.ts";
import type { SetQuantityProps } from "../../../actions/minicart/setQuantity.ts";

export default async function setQuantity(
  props: SetQuantityProps,
  _req: Request,
  ctx: AppContext,
) {
  const response = await ctx.invoke(
    "shopify/actions/cart/updateItems.ts",
    {
      lines: [{
        id: props.itemId,
        quantity: props.quantity,
      }],
    },
  );

  return response;
}
