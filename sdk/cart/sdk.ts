import type { Product } from "apps/commerce/types.ts";

declare global {
  interface Window {
    STOREFRONT: {
      CART: CartSDK;
    };
  }
}

export interface Item {
  item_name: string;
  item_id: string;
  affiliation?: string;
  coupon?: string;
  discount?: number;
  index?: number;
  item_group_id?: string;
  item_url?: string;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_list_id?: string;
  item_list_name?: string;
  item_variant?: string;
  location_id?: string;
  price?: number;
  quantity: number;
  listPrice: number;
  image: string;
}

export interface Cart {
  currency: string;
  coupon: string;
  value: string;
  items: Item[];
}

interface SetQuantityProps {
  itemId: string;
  quantity: number;
}

export interface AddToCartProps {
  productId: string;
  productGroupId: string;
  quantity: number;
  /**
   * Additional attributes to add to the cart item.
   * Only required on VNDA and Nuvemshop integrations
   */
  attributes?: { name: string; value: string }[];
}

type Events = "cart:itemAdded" | "cart:itemUpdated" | "cart";
const events: Events[] = ["cart:itemAdded", "cart:itemUpdated", "cart"];

export interface CartSDK {
  getCart: () => Cart | null;
  getQuantity: (itemId: string) => number | null;
  setQuantity: (props: SetQuantityProps) => Promise<unknown>; // should return the item or updated cart
  addToCart: (props: AddToCartProps) => Promise<unknown>; // should return the item or updated cart
  dispatch: (form: HTMLFormElement) => void;
  subscribe: (
    event: Events | "all" | Events[],
    cb: (sdk: CartSDK) => unknown | Promise<unknown>,
    opts?: boolean | AddEventListenerOptions,
  ) => void;
}

export function createCartSDK(): CartSDK {
  // we are using the body so we can target using htmx, ex: hx-trigger="cartItemUpdated from:body"
  const target = document.body;
  let cart: Cart | null = null;

  function dispatchEvent(event: Events) {
    console.log(`dispatching ${event}`);
    target.dispatchEvent(new Event(event));
  }

  const getCart: CartSDK["getCart"] = () => {
    return cart;
  };

  const getQuantity: CartSDK["getQuantity"] = (itemId) => {
    const cart = getCart();
    if (!cart) {
      return null;
    }

    return cart.items.find((item) => item.item_id === itemId)?.quantity ?? null;
  };

  const setQuantity: CartSDK["setQuantity"] = async ({ itemId, quantity }) => {
    const cart = getCart();
    if (!cart) {
      return null;
    }

    const result = await fetch(
      "/live/invoke/site/actions/minicart/setQuantity.ts",
      {
        method: "POST",
        body: JSON.stringify({ itemId, quantity }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (result.ok) {
      dispatchEvent("cart:itemUpdated");

      const item = await result.json() as Item;

      window.DECO.events.dispatch({
        name: !item || item.quantity < quantity
          ? "add_to_cart"
          : "remove_from_cart",
        params: { items: [{ ...item, quantity }] },
      });

      return item;
    }

    throw new Error(`Failed to set quantity: ${result.statusText}`);
  };

  const addToCart: CartSDK["addToCart"] = async (props) => {
    const { productId, quantity } = props;
    const cart = getCart();
    if (cart) {
      const cartItem = cart.items.find(({ item_id }) => item_id === productId);

      if (cartItem) {
        return setQuantity({
          itemId: cartItem.item_id,
          quantity: cartItem.quantity + quantity,
        });
      }
    }

    const result = await fetch(
      "/live/invoke/site/actions/minicart/addToCart.ts",
      {
        method: "POST",
        body: JSON.stringify(props),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (result.ok) {
      const item = await result.json();

      dispatchEvent("cart:itemAdded");

      window.DECO.events.dispatch({
        name: "add_to_cart",
        params: { items: [item] },
      });

      return item;
    }

    throw new Error(`Failed to add to cart: ${result.statusText}`);
  };

  const sdk: CartSDK = {
    getCart,
    getQuantity,
    setQuantity,
    addToCart,
    dispatch: (form: HTMLFormElement) => {
      cart = JSON.parse(
        decodeURIComponent(
          form.querySelector<HTMLInputElement>('input[name="storefront-cart"]')
            ?.value || "{}",
        ),
      ) as Cart;

      dispatchEvent("cart");
    },
    subscribe: (event, cb, opts) => {
      const addEventListener = (event: Events) => {
        target.addEventListener(event, () => cb(sdk), opts);
      };

      if (Array.isArray(event)) {
        event.forEach(addEventListener);
      } else if (event === "all") {
        events.forEach(addEventListener);
      } else {
        addEventListener(event);
      }

      return cb(sdk);
    },
  };

  window.STOREFRONT = window.STOREFRONT || {};
  window.STOREFRONT.CART = sdk;

  return sdk;
}

export function toAddToCartProps(product: Product): AddToCartProps {
  return {
    productId: product.productID,
    productGroupId: product.isVariantOf?.productGroupID || "",
    quantity: 1,
    attributes: product.additionalProperty
      ?.filter((property) => property.name && property.value)
      .map((property) => ({ name: property.name!, value: property.value! })) || [],
  };
}
