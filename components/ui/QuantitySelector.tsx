import { useScript } from "@deco/deco/hooks";
import { type JSX } from "preact";
import { clx } from "../../sdk/clx.ts";
import { useId } from "../../sdk/useId.ts";

const onClick = (delta: number) => {
  event!.stopPropagation();
  const button = event!.currentTarget as HTMLButtonElement;
  const input = button.parentElement
    ?.querySelector<HTMLInputElement>('input[type="number"]')!;
  const min = Number(input.min) || -Infinity;
  const max = Number(input.max) || Infinity;
  input.value = `${Math.min(Math.max(input.valueAsNumber + delta, min), max)}`;
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const onChange = () => {
  event!.stopPropagation();
  const input = event!.currentTarget as HTMLInputElement;
  const quantity = Number(input.value) ?? 0;

  const itemId = input?.closest("fieldset")?.getAttribute("data-item-id");

  if (!itemId) return;

  window.STOREFRONT.CART.setQuantity({
    itemId,
    quantity,
  });
};

function QuantitySelector({
  id = useId(),
  disabled,
  ...props
}: JSX.IntrinsicElements["input"]) {
  return (
    <div class="join border rounded w-full">
      <button
        type="button"
        class="btn btn-square btn-ghost no-animation"
        hx-on:click={useScript(onClick, -1)}
        disabled={disabled}
      >
        -
      </button>
      <div
        data-tip={`Quantity must be between ${props.min} and ${props.max}`}
        class={clx(
          "flex-grow join-item",
          "flex justify-center items-center",
          "has-[:invalid]:tooltip has-[:invalid]:tooltip-error has-[:invalid]:tooltip-open has-[:invalid]:tooltip-bottom",
        )}
      >
        <input
          id={id}
          class={clx(
            "input text-center flex-grow [appearance:textfield]",
            "invalid:input-error",
          )}
          disabled={disabled}
          inputMode="numeric"
          type="number"
          hx-on:change={useScript(onChange)}
          {...props}
        />
      </div>
      <button
        type="button"
        class="btn btn-square btn-ghost no-animation"
        hx-on:click={useScript(onClick, 1)}
        disabled={disabled}
      >
        +
      </button>
    </div>
  );
}
export default QuantitySelector;
