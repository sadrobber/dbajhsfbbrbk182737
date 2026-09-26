import { NextResponse } from "next/server";
import { getOrder } from "@/lib/data/order-repository";
import { canViewOrder, orderPagePath } from "@/server/orders/access";
import { syncOrderPayment } from "@/server/orders/payment-sync";
import { refreshAfterOrderChange } from "@/server/orders/refresh";

/**
 * Where the payment page sends the customer back. Checks the payment with the
 * provider (so the order is up to date even before the webhook arrives), then
 * shows the order page.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/orders/[id]/return">) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? undefined;
  const order = await getOrder(id);
  if (!order || !canViewOrder(order, token)) return new NextResponse("Not found", { status: 404 });

  try {
    await syncOrderPayment(order.id);
    refreshAfterOrderChange();
  } catch (error) {
    // The order page still shows "payment being confirmed"; the webhook will catch up.
    console.error(`[payments] could not check order ${order.number}:`, error);
  }
  return NextResponse.redirect(new URL(orderPagePath(order), request.url), 303);
}
