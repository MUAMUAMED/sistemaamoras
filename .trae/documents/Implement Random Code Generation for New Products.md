I will modify the product creation route (`POST /api/products`) to implement the requested logic:

1.  **Generate Random Code**: Create a random 12-digit numeric string for each new product.
2.  **Assign to Name and Barcode**: Use this random code as both the `name` and the `barcode` of the product.
    *   This ensures the barcode is unique, preventing the "Product already exists" logic from triggering.
    *   This effectively forces the creation of a **new product** every time, bypassing the automatic stock merging.
3.  **Persist Images**: Ensure that the images sent in the request are correctly saved to this new product.

This change allows you to create products without worrying about attribute collisions, and you can later edit the product (via the existing Update route) to set the correct name and regenerate the standard barcode if desired.