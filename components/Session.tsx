import { Head } from "$fresh/runtime.ts";
import { useScript } from "@deco/deco/hooks";
import { type AppContext } from "../apps/site.ts";
import { MINICART_DRAWER_ID } from "../constants.ts";
import { createCartSDK } from "../sdk/cart/sdk.ts";
import { useComponent } from "../sections/Component.tsx";
import CartProvider, { type Minicart } from "./minicart/Minicart.tsx";
import Drawer from "./ui/Drawer.tsx";

interface Props {
  minicart?: Minicart | null;
  mode?: "eager" | "lazy";
}

export const action = async (
  _props: unknown,
  _req: Request,
  ctx: AppContext,
) => {
  const [minicart] = await Promise.all([
    ctx.invoke("site/loaders/minicart.ts"),
  ]);

  return {
    mode: "eager",
    minicart,
  };
};

export const loader = (_props: unknown, _req: Request, _ctx: AppContext) => {
  return {
    mode: "lazy",
  };
};

export default function Session({
  minicart,
  mode = "lazy",
}: Props) {
  if (mode === "lazy") {
    return (
      <>
        <Head>
          {
            /* <script
            type="module"
            dangerouslySetInnerHTML={{ __html: useScript(sdk) }}
          /> */
          }
          <script
            type="module"
            dangerouslySetInnerHTML={{ __html: useScript(createCartSDK) }}
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
    </>
  );
}
