I will modify the product workflow to support a "Draft" state followed by a "Finalization" state:

1.  **Creation (Draft Mode - POST /api/products)**:
    *   When creating a product with minimal info (e.g., only size and photos), use the **random code** for `barcode` and `name`.
    *   Keep the status as `PROCESSANDO` and `inProduction: true`.
    *   This allows the product to exist in the database with its photos, without conflicting with real products.

2.  **Update (Finalization Mode - PUT /api/products/:id)**:
    *   When the user edits this "draft" product and provides the full information (Category, Pattern, etc.):
    *   **Re-enable barcode generation**: Allow the system to generate the standard barcode (e.g., `21500032...`) based on the new attributes.
    *   **Validate Uniqueness**: Check if this generated barcode already exists.
    *   **Handle Conflict**: If it exists (meaning the real product is already in the system), we cannot just change the barcode. Instead, we should:
        *   (Option A - Simpler): Return an error saying "Product already exists".
        *   (Option B - Merge - **Recommended for this flow**): Move the stock and images from this "draft" product to the existing "real" product, and then delete the draft.

    *   **Wait**: The user's request "somente quando editar... ai sim vai ser colocado esse código novo" implies that the *standard* barcode logic should run on update.

**Revised Plan:**

1.  **POST (Create)**: Keep the **random code** logic. This creates the "scope" product.
2.  **PUT (Update)**:
    *   Check if the product currently has a random barcode (is in "draft" state).
    *   If the user provides Category/Pattern/etc., **generate the standard barcode**.
    *   Update the product's barcode to this standard one.
    *   If that standard barcode *already exists* (conflict), return a clear error: "Um produto com essas características já existe. Por favor, adicione estoque ao produto existente em vez de criar um novo." (Merging is complex via simple update, error is safer).

This matches your request: creation = random code (scope), update = real code.