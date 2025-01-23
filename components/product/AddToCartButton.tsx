import { useScript } from "@deco/deco/hooks";
import type { AnalyticsItem, Product } from "apps/commerce/types.ts";
import type { JSX } from "preact";
import type { AddToCartProps } from "../../sdk/cart/sdk.ts";
import { clx } from "../../sdk/clx.ts";
import { useId } from "../../sdk/useId.ts";
import QuantitySelector from "../ui/QuantitySelector.tsx";

export interface Props extends JSX.HTMLAttributes<HTMLButtonElement> {
  product: Product;
  seller: string;
  item: AnalyticsItem;
}

const onClick = async (props: AddToCartProps) => {
  event?.stopPropagation();
  await window.STOREFRONT.CART.addToCart(props);
};

const onChange = (productId: string) => {
  const input = event!.currentTarget as HTMLInputElement;
  const quantity = Number(input.value);
  if (!input.validity.valid) {
    return;
  }
  window.STOREFRONT.CART.setQuantity({ itemId: productId, quantity });
};

// Copy cart form values into AddToCartButton
const onLoad = ({ productId, id }: { productId: string; id: string }) => {
  window.STOREFRONT.CART.subscribe("cart", (sdk) => {
    const container = document.getElementById(id);
    const checkbox = container?.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    const input = container?.querySelector<HTMLInputElement>(
      'input[type="number"]',
    );

    if (!input || !checkbox) {
      return;
    }

    const quantity = sdk.getQuantity(productId) || 0;
    input.value = quantity.toString();
    checkbox.checked = quantity > 0;

    container?.querySelectorAll<HTMLButtonElement>("button").forEach((node) =>
      node.disabled = false
    );
    container?.querySelectorAll<HTMLButtonElement>("input").forEach((node) =>
      node.disabled = false
    );
  });
};

export default function AddToCartButton(props: Props) {
  const { product, class: _class } = props;
  const id = useId();

  return (
    <div id={id} class="flex">
      <input type="checkbox" class="hidden peer" />

      <button
        disabled
        class={clx("flex-grow peer-checked:hidden", _class?.toString())}
        hx-on:click={useScript(onClick, {
          productId: product.productID,
          productGroupId: product.isVariantOf?.productGroupID || "",
          quantity: 1,
        })}
      >
        Add to Cart
      </button>

      {/* Quantity Input */}
      <div class="flex-grow hidden peer-checked:flex">
        <QuantitySelector
          disabled
          min={0}
          max={100}
          hx-on:change={useScript(onChange, product.productID)}
        />
      </div>

      <script
        type="module"
        dangerouslySetInnerHTML={{
          __html: useScript(onLoad, { id, productId: product.productID }),
        }}
      />
    </div>
  );
}
