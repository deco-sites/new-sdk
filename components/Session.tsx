import { Head } from "$fresh/runtime.ts";
import { type Person } from "apps/commerce/types.ts";
import { type AppContext } from "../apps/site.ts";
import { MINICART_DRAWER_ID } from "../constants.ts";
import { useComponent } from "../sections/Component.tsx";
import { type Item } from "./minicart/Item.tsx";
import CartProvider, { type Minicart } from "./minicart/Minicart.tsx";
import Drawer from "./ui/Drawer.tsx";
import UserProvider from "./user/Provider.tsx";
import WishlistProvider, { type Wishlist } from "./wishlist/Provider.tsx";
import { useScript } from "@deco/deco/hooks";

declare global {
  interface Window {
    STOREFRONT: SDK;
  }
}

export interface Cart {
  currency: string;
  coupon: string;
  value: string;
  items: Item[];
}

export interface SDK {
  CART: {
    // TODO: implement get cart type
    getCart: () => Cart | null;
    getQuantity: (itemId: string) => number | null;
    setQuantity: (
      props: { itemId: string; quantity: number },
    ) => Promise<unknown>; // should return the item or updated cart
    addToCart: (
      props: { item: Item; platformProps: unknown },
    ) => Promise<unknown>; // should return the item or updated cart
    subscribe: (
      cb: (sdk: SDK["CART"]) => void,
      opts?: boolean | AddEventListenerOptions,
    ) => void;
    dispatch: (form: HTMLFormElement) => void;
  };
  // TODO: implement this later
  // USER: {
  //   getUser: () => Person | null;
  //   subscribe: (
  //     cb: (sdk: SDK["USER"]) => void,
  //     opts?: boolean | AddEventListenerOptions,
  //   ) => void;
  //   dispatch: (person: Person) => void;
  // };
  // WISHLIST: {
  //   toggle: (productID: string, productGroupID: string) => boolean;
  //   inWishlist: (productID: string) => boolean;
  //   subscribe: (
  //     cb: (sdk: SDK["WISHLIST"]) => void,
  //     opts?: boolean | AddEventListenerOptions,
  //   ) => void;
  //   dispatch: (form: HTMLFormElement) => void;
  // };
}

const sdk = () => {
  // const target = new EventTarget();
  const target = document.body;

  const createCartSDK = (): SDK["CART"] => {
    // initial state of sdk, when minicart is rendered it must call dispatch to update the state
    let form: HTMLFormElement | null = null;
    let cart: Cart | null = null;

    function getCart() {
      return cart;
    }

    function getQuantity(itemId: string): number | null {
      const cart = getCart();
      if (!cart) {
        return null;
      }

      return cart.items.find((item) => item.item_id === itemId)?.quantity ??
        null;
    }

    async function setQuantity(
      { itemId, quantity }: { itemId: string; quantity: number },
    ) {
      const cart = getCart();
      if (!cart) {
        return null;
      }

      const item = cart.items.find((item) => item.item_id === itemId);

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
        target.dispatchEvent(new Event("cartItemUpdated"));
        window.DECO.events.dispatch({
          name: !item || item.quantity < quantity
            ? "add_to_cart"
            : "remove_from_cart",
          params: { items: [{ ...item, quantity }] },
        });
        return result.json();
      }

      throw new Error(`Failed to set quantity: ${result.statusText}`);
    }

    async function addToCart(
      { item, platformProps }: { item: Item; platformProps: unknown },
    ) {
      const cart = getCart();
      if (cart) {
        const item = cart.items.find(({ item_id }) => item_id === item.item_id);
        if (item) {
          return setQuantity({
            itemId: item.item_id,
            quantity: item.quantity + 1,
          });
        }
      }

      const result = await fetch("/live/invoke/site/actions/minicart/addToCart.ts", {
        method: "POST",
        body: JSON.stringify({ id: item.item_id, quantity: item.quantity }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (result.ok) {
        const item = await result.json();
        cart?.items.push(item);
        target.dispatchEvent(new Event("cartItemAdded"));
        window.DECO.events.dispatch({
          name: "add_to_cart",
          params: { items: [item] },
        });
        return item;
      }

      throw new Error(`Failed to add to cart: ${result.statusText}`);
    }

    const sdk: SDK["CART"] = {
      getCart,
      getQuantity,
      setQuantity,
      addToCart,
      subscribe: (cb, opts) => {
        ["cartItemUpdated", "cartItemAdded", "cart"].forEach((event) => {
          target.addEventListener(event, () => {
            console.log(event, sdk.getCart());
            cb(sdk)
          }, opts);
        });
        if (form) {
          cb(sdk);
        }
      },
      dispatch: (f: HTMLFormElement) => {
        form = f;
        cart = JSON.parse(
          decodeURIComponent(
            f.querySelector<HTMLInputElement>('input[name="storefront-cart"]')
              ?.value || "{}",
          ),
        ) as Cart;
        target.dispatchEvent(new Event("cart"));
      },
    };
    return sdk;
  };
  const createAnalyticsSDK = () => {
    addEventListener("load", () => {
      function sendEvent(e: Element | null) {
        const event = e?.getAttribute("data-event");
        if (!event) {
          return;
        }
        const decoded = JSON.parse(decodeURIComponent(event));
        window.DECO.events.dispatch(decoded);
      }
      function handleClick(e: Event) {
        e.stopPropagation();
        sendEvent(e.currentTarget as HTMLElement | null);
      }
      // Only available on newer safari versions
      const handleView = typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver((items) => {
          for (const item of items) {
            const { isIntersecting, target } = item;
            if (!isIntersecting) {
              continue;
            }
            handleView!.unobserve(target);
            sendEvent(target);
          }
        })
        : null;
      const listener = (node: Element) => {
        const maybeTrigger = node.getAttribute("data-event-trigger");
        const on = maybeTrigger === "click" ? "click" : "view";

        if (on === "click") {
          node.addEventListener("click", handleClick, {
            passive: true,
          });
          return;
        }

        if (on === "view") {
          handleView?.observe(node);
          return;
        }
      };

      document.body.querySelectorAll("[data-event]").forEach(listener);

      document.body.addEventListener(
        "htmx:load",
        (e) =>
          (e as unknown as { detail: { elt: HTMLElement } })
            .detail.elt.querySelectorAll("[data-event]").forEach(listener),
      );
    });
  };
  // const createUserSDK = () => {
  //   let person: Person | null = null;
  //   const sdk: SDK["USER"] = {
  //     getUser: () => person,
  //     subscribe: (cb, opts) => {
  //       target.addEventListener("person", () => cb(sdk), opts);
  //       cb(sdk);
  //     },
  //     dispatch: (p: Person) => {
  //       person = p;
  //       target.dispatchEvent(new Event("person"));
  //     },
  //   };
  //   return sdk;
  // };
  // const createWishlistSDK = () => {
  //   let form: HTMLFormElement | null = null;
  //   let productIDs: Set<string> = new Set();
  //   const sdk: SDK["WISHLIST"] = {
  //     toggle: (productID: string, productGroupID: string) => {
  //       if (!form) {
  //         console.error("Missing wishlist Provider");
  //         return false;
  //       }
  //       form.querySelector<HTMLInputElement>('input[name="product-id"]')!
  //         .value = productID;
  //       form.querySelector<HTMLInputElement>('input[name="product-group-id"]')!
  //         .value = productGroupID;
  //       form.querySelector<HTMLButtonElement>("button")?.click();
  //       return true;
  //     },
  //     inWishlist: (id: string) => productIDs.has(id),
  //     subscribe: (cb, opts) => {
  //       target.addEventListener("wishlist", () => cb(sdk), opts);
  //       cb(sdk);
  //     },
  //     dispatch: (f: HTMLFormElement) => {
  //       form = f;
  //       const script = f.querySelector<HTMLScriptElement>(
  //         'script[type="application/json"]',
  //       );
  //       const wishlist: Wishlist | null = script
  //         ? JSON.parse(script.innerText)
  //         : null;
  //       productIDs = new Set(wishlist?.productIDs);
  //       target.dispatchEvent(new Event("wishlist"));
  //     },
  //   };
  //   return sdk;
  // };
  createAnalyticsSDK();
  window.STOREFRONT = {
    CART: createCartSDK(),
    // USER: createUserSDK(),
    // WISHLIST: createWishlistSDK(),
  };
};
export const action = async (
  _props: unknown,
  _req: Request,
  ctx: AppContext,
) => {
  const [minicart/*wishlist, user*/
  ] = await Promise.all([
    ctx.invoke("site/loaders/minicart.ts"),
    // ctx.invoke("site/loaders/wishlist.ts"),
    // ctx.invoke("site/loaders/user.ts"),
  ]);
  return {
    mode: "eager",
    minicart,
    // wishlist,
    // user,
  };
};

export const loader = (_props: unknown, _req: Request, _ctx: AppContext) => {
  return {
    mode: "lazy",
  };
};

interface Props {
  minicart?: Minicart | null;
  wishlist?: Wishlist | null;
  user?: Person | null;
  mode?: "eager" | "lazy";
}

export default function Session({
  minicart,
  // wishlist,
  // user,
  mode = "lazy",
}: Props) {
  if (mode === "lazy") {
    return (
      <>
        <Head>
          <script
            type="module"
            dangerouslySetInnerHTML={{ __html: useScript(sdk) }}
          />
        </Head>
        <div hx-trigger="load" hx-post={useComponent(import.meta.url)} />
      </>
    );
  }
  return (
    <>
      {/* Minicart Drawer */}
      <Drawer
        id={MINICART_DRAWER_ID}
        class="drawer-end z-50"
        aside={
          <Drawer.Aside title="My Bag" drawer={MINICART_DRAWER_ID}>
            <div
              class="h-full flex flex-col bg-base-100 items-center justify-center overflow-auto"
              style={{
                minWidth: "calc(min(100vw, 425px))",
                maxWidth: "425px",
              }}
            >
              <CartProvider cart={minicart!} />
            </div>
          </Drawer.Aside>
        }
      />

      {
        /* <WishlistProvider wishlist={wishlist ?? null} />
      <UserProvider user={user ?? null} /> */
      }
    </>
  );
}
