import { useScript } from "@deco/deco/hooks";
import Image from "apps/website/components/Image.tsx";
import { Item } from "../../sdk/cart/sdk.ts";
import { clx } from "../../sdk/clx.ts";
import { formatPrice } from "../../sdk/format.ts";
import Icon from "../ui/Icon.tsx";
import QuantitySelector from "../ui/QuantitySelector.tsx";

export interface Props {
  item: Item;
  index: number;
  locale: string;
  currency: string;
}

const QUANTITY_MAX_VALUE = 100;

const removeItemHandler = () => {
  const itemId = (event?.currentTarget as HTMLButtonElement | null)
    ?.closest("fieldset")
    ?.getAttribute("data-item-id");
  if (typeof itemId === "string") {
    window.STOREFRONT.CART.setQuantity({ itemId, quantity: 0 });
  }
};

function CartItem({ item, index, locale, currency }: Props) {
  const { image, listPrice, price = Infinity, quantity } = item;
  const isGift = price < 0.01;
  const name = item.item_name;

  return (
    <fieldset
      data-item-id={item.item_group_id}
      class="grid grid-rows-1 gap-2"
      style={{ gridTemplateColumns: "auto 1fr" }}
    >
      <Image
        alt={name}
        src={image}
        style={{ aspectRatio: "108 / 150" }}
        width={108}
        height={150}
        class="h-full object-contain"
      />

      {/* Info */}
      <div class="flex flex-col gap-2">
        {/* Name and Remove button */}
        <div class="flex justify-between items-center">
          <legend>{name}</legend>
          <button
            class={clx(
              isGift && "hidden",
              "btn btn-ghost btn-square no-animation",
            )}
            hx-on:click={useScript(removeItemHandler)}
          >
            <Icon id="trash" size={24} />
          </button>
        </div>

        {/* Price Block */}
        <div class="flex items-center gap-2">
          <span class="line-through text-sm">
            {formatPrice(listPrice, currency, locale)}
          </span>
          <span class="text-sm text-secondary">
            {isGift ? "Grátis" : formatPrice(price, currency, locale)}
          </span>
        </div>

        {/* Quantity Selector */}
        <div class={clx(isGift && "hidden")}>
          <QuantitySelector
            min={0}
            max={QUANTITY_MAX_VALUE}
            value={quantity}
            name={`item::${index}`}
          />
        </div>
      </div>
    </fieldset>
  );
}
export default CartItem;
