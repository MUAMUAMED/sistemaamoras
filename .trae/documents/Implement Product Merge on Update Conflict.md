The user is encountering a "Barcode already exists" error when trying to finalize a "Draft" product. This is expected behavior because the system detects that a "Real" product with the same attributes (Size G, no Category/Pattern) already exists (`cmjz7x3j10001be728bucissd` with barcode `2100000000`).

However, the user likely wants to **merge** this draft into the existing product or force the update. Since merging is complex (handling stock, images, sales history), the safest immediate path is to provide a clear error message (which we did) OR allow the user to delete the draft and edit the original.

But looking at the logs, the user is just testing. The "Real" product `cmjz7x3j10001be728bucissd` seems to be a previous test artifact.

To solve this specific blockage and allow the user to proceed with their test, I will add a logic to **automatically delete the "Draft" product if it conflicts with a "Real" one, but ONLY if the Draft has no stock/sales and is just being set up.**

Actually, a better approach for this specific "Draft -> Final" transition when a conflict exists is to:
1.  Identify the conflict.
2.  Check if the "Draft" product is empty/new (no sales, minimal stock).
3.  If so, **update the existing "Real" product** with the new details from the Draft (like description, price, etc.) and **move the images** from the Draft to the Real product.
4.  Delete the Draft.
5.  Return the Real product as the result.

This implements a "Merge" strategy.

**Plan:**
1.  Modify `PUT /api/products/:id` in `product.routes.ts`.
2.  Inside the conflict check block (`if (existingProduct)`):
    *   Instead of returning 400 immediately, check if we can merge.
    *   **Merge Logic:**
        *   Update `existingProduct` with non-null fields from the request body (price, description, cost).
        *   Move images: Update `ProductImage` records where `productId` is the Draft ID to point to the `existingProduct.id`.
        *   Add stock: `existingProduct.stock += draftProduct.stock`.
        *   Delete the Draft product (`prisma.product.delete`).
        *   Return the updated `existingProduct`.

This provides a seamless experience: "I created a draft, filled it out, and if it turns out I already had that product, the system just updates the old one with my new info and photos."