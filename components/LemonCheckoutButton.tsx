"use client";

import { useMemo } from "react";

declare global {
  interface Window {
    LemonSqueezy?: {
      Url: {
        Open: (url: string) => void;
      };
    };
  }
}

type LemonCheckoutButtonProps = {
  plan: "starter" | "growth";
  className?: string;
  children: React.ReactNode;
};

export function LemonCheckoutButton({ plan, className, children }: LemonCheckoutButtonProps): React.ReactNode {
  const checkoutUrl = useMemo(() => {
    const productHandle = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID ?? "";
    if (!productHandle) {
      return "";
    }

    const root = productHandle.startsWith("http")
      ? productHandle
      : `https://app.lemonsqueezy.com/checkout/buy/${productHandle}`;

    const url = new URL(root);
    url.searchParams.set("embed", "1");
    url.searchParams.set("media", "0");
    url.searchParams.set("checkout[custom][plan]", plan);

    const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;
    if (storeId) {
      url.searchParams.set("checkout[custom][store]", storeId);
    }

    return url.toString();
  }, [plan]);

  const isDisabled = !checkoutUrl;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => {
        if (!checkoutUrl) {
          return;
        }

        if (window.LemonSqueezy?.Url?.Open) {
          window.LemonSqueezy.Url.Open(checkoutUrl);
          return;
        }

        window.location.href = checkoutUrl;
      }}
      className={
        className ??
        "inline-flex items-center justify-center rounded-md border border-[#2f81f7] bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb] disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {children}
    </button>
  );
}
