/**
 * @description Parse an element's data-event attribute and dispatch the event
 */
function sendEvent(element: Element | null) {
  const event = element?.getAttribute("data-event");
  if (!event) {
    return;
  }

  const decoded = JSON.parse(decodeURIComponent(event));
  window.DECO.events.dispatch(decoded);
}

/**
 * @description Handle click and dispatch the event
 */
function handleClick(event: Event) {
  event.stopPropagation();
  sendEvent(event.currentTarget as HTMLElement | null);
}

export function createAnalyticsSDK() {
  addEventListener("load", () => {
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
      (e) => {
        const event = e as unknown as { detail: { elt: HTMLElement } };
        event.detail.elt.querySelectorAll("[data-event]").forEach(listener);
      },
    );
  });
}
