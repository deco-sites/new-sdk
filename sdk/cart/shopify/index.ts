import type { AppContext as SiteAppContext } from "../../../apps/site.ts";
import type { AppContext as ShopifyAppContext } from "apps/shopify/mod.ts";

export type AppContext = SiteAppContext & ShopifyAppContext;
